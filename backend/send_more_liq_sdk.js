const { Client, PrivateKey, AccountId, TransferTransaction, Hbar } = require("@hashgraph/sdk");
require("dotenv").config({ path: "../.env" });

async function main() {
    const operatorId = AccountId.fromString("0.0.10418925");
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_KEY);
    const client = Client.forMainnet().setOperator(operatorId, operatorKey);
    
    // Contract EVM: 0x6E165d21dd0B57da3F75CC56C97F9d3C82e42c81
    // We can transfer HBAR to it by finding its Account ID, or simply sending to its EVM address
    const contractAccountId = AccountId.fromEvmAddress(0, 0, "0x6E165d21dd0B57da3F75CC56C97F9d3C82e42c81");
    
    console.log("Sending 19 HBAR to new contract via Hedera SDK...");
    
    const tx = new TransferTransaction()
        .addHbarTransfer(operatorId, new Hbar(-19))
        .addHbarTransfer(contractAccountId, new Hbar(19));
        
    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    
    console.log("Status:", receipt.status.toString());
    process.exit(0);
}

main().catch(console.error);
