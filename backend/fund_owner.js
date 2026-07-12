require("dotenv").config({ path: "../.env" });
const { Client, PrivateKey, AccountId, TransferTransaction, Hbar } = require("@hashgraph/sdk");

async function main() {
    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_KEY);
    const client = Client.forMainnet();
    client.setOperator(operatorId, operatorKey);

    const ownerId = AccountId.fromString("0.0.10627830");

    console.log(`Transferring 1.5 HBAR to Owner...`);
    const tx = new TransferTransaction()
        .addHbarTransfer(operatorId, Hbar.fromTinybars(-150000000))
        .addHbarTransfer(ownerId, Hbar.fromTinybars(150000000))
        .freezeWith(client);

    const signTx = await tx.sign(operatorKey);
    const response = await signTx.execute(client);
    const receipt = await response.getReceipt(client);
    
    console.log(`Status: ${receipt.status.toString()}`);
    process.exit(0);
}

main().catch(console.error);
