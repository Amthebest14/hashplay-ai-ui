require("dotenv").config({ path: "../.env" });
const { Client, AccountId, TokenId, TransferTransaction, Hbar, PrivateKey } = require("@hashgraph/sdk");

async function main() {
    const operatorId = AccountId.fromString(process.env.TESTNET_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.TESTNET_OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V2_ID = AccountId.fromString("0.0.8119191");
    const TOKEN_ID = TokenId.fromString("0.0.8076828");

    console.log("--- HARDCODED V2 FUNDING ---");

    const fundHbar = new Hbar(500);
    const fundToken = 2000000000000000n; // 20M

    console.log(`Funding V2 from Treasury...`);

    const tx = await new TransferTransaction()
        .addHbarTransfer(operatorId, fundHbar.negated())
        .addHbarTransfer(V2_ID, fundHbar)
        .addTokenTransfer(TOKEN_ID, operatorId, -fundToken)
        .addTokenTransfer(TOKEN_ID, V2_ID, fundToken)
        .execute(client);

    const receipt = await tx.getReceipt(client);
    console.log("Status:", receipt.status.toString());
    console.log("--- SUCCESS ---");
}

main().catch(console.error);
