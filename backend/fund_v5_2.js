const { Client, AccountId, PrivateKey, TransferTransaction, Hbar } = require("@hashgraph/sdk");
require('dotenv').config({ path: '../.env' });

async function main() {
    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_KEY);
    const client = Client.forMainnet().setOperator(operatorId, operatorKey);

    const contractId = "0.0.10420650"; // 0xcec25013eCE3eC5a1b090261880eb2aeB7ffb9c8
    
    console.log(`Funding V5.2 (${contractId}) with 5 HBAR...`);
    
    const transaction = new TransferTransaction()
        .addHbarTransfer(operatorId, new Hbar(-5))
        .addHbarTransfer(contractId, new Hbar(5))
        .freezeWith(client);
    
    const signTx = await transaction.sign(operatorKey);
    const txResponse = await signTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    
    console.log(`✅ Funded! Status: ${receipt.status.toString()}`);
}

main().catch(console.error);
