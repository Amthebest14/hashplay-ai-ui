const { Client, AccountId, TokenId, TransferTransaction, Hbar } = require("@hashgraph/sdk");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "../.env") });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID);
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V2_ID = "0.0.8119191";
    const TOKEN_ID = process.env.VITE_HASHPLAY_TOKEN_ID;

    console.log("--- DIRECT V2 FUNDING ---");

    // Fund with 2,000 HBAR and 20 Million Tokens
    const fundHbar = new Hbar(500); // Treasury has ~998 HBAR, let's use 500 for now to be safe
    const fundToken = 2000000000000000n; // 20M (8 decimals)

    console.log(`Funding V2 (${V2_ID}) from Treasury (${operatorId})...`);

    const tx = await new TransferTransaction()
        .addHbarTransfer(operatorId, fundHbar.negated())
        .addHbarTransfer(V2_ID, fundHbar)
        .addTokenTransfer(TokenId.fromString(TOKEN_ID), operatorId, -fundToken)
        .addTokenTransfer(TokenId.fromString(TOKEN_ID), V2_ID, fundToken)
        .execute(client);

    const receipt = await tx.getReceipt(client);
    console.log("Status:", receipt.status.toString());
    console.log("--- FUNDING SUCCESSFUL ---");
}

main().catch(console.error);
