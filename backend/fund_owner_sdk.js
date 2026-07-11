const { Client, TransferTransaction, Hbar, AccountId } = require("@hashgraph/sdk");
require("dotenv").config({ path: "../.env" });

async function main() {
    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const client = Client.forMainnet().setOperator(operatorId, operatorKey);
    
    // The OWNER_KEY EVM address is 0x20550f6024be718b03dc458f83ae5c0d7e79f01e
    // Let's transfer 1 HBAR to this EVM address. Hedera supports alias transfers.
    const evmAddress = "0x20550f6024be718b03dc458f83ae5c0d7e79f01e";
    
    console.log("Funding OWNER_KEY via Hedera SDK...");
    const tx = new TransferTransaction()
        .addHbarTransfer(operatorId, new Hbar(-1.0))
        .addHbarTransfer(evmAddress, new Hbar(1.0));
        
    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    console.log("Transfer Status:", receipt.status.toString());
}

main().catch(console.error);
