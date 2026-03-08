const { Client, AccountId, TokenId, AccountBalanceQuery } = require("@hashgraph/sdk");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "../.env") });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID); // 0.0.7810956
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V1_ID = AccountId.fromString("0.0.8103703");
    const V2_ID = AccountId.fromString("0.0.8119191");
    const TOKEN_ID = TokenId.fromString(process.env.VITE_HASHPLAY_TOKEN_ID);

    console.log("--- FINAL STATUS CHECK ---");

    async function check(id, label) {
        const balance = await new AccountBalanceQuery().setAccountId(id).execute(client);
        const hash = balance.tokens.get(TOKEN_ID) || 0n;
        console.log(`${label} (${id}):`);
        console.log(`  HBAR: ${balance.hbars.toString()}`);
        console.log(`  $HASH: ${hash.toString()}`);
    }

    await check(operatorId, "TREASURY");
    await check(V1_ID, "V1_CONTRACT");
    await check(V2_ID, "V2_CONTRACT");

    console.log("--- CHECK END ---");
}

main().catch(console.error);
