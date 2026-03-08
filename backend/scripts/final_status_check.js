const { Client, AccountBalanceQuery, AccountId, TokenId } = require("@hashgraph/sdk");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID);
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V1_ID = "0.0.8103703";
    const V2_ID = "0.0.8119191";
    const TOKEN_ID = process.env.VITE_HASHPLAY_TOKEN_ID;

    console.log("--- LIVE STATUS CHECK ---");

    async function getStatus(id, name) {
        try {
            const balance = await new AccountBalanceQuery().setAccountId(id).execute(client);
            const hashBalance = balance.tokens.get(TokenId.fromString(TOKEN_ID)) || 0n;
            console.log(`${name} (${id}):`);
            console.log(`  HBAR: ${balance.hbars.toString()}`);
            console.log(`  $HASH: ${hashBalance.toString()}`);
        } catch (e) {
            console.log(`${name} (${id}) Error: ${e.message}`);
        }
    }

    await getStatus(operatorId, "TREASURY");
    await getStatus(V1_ID, "V1_CONTRACT");
    await getStatus(V2_ID, "V2_CONTRACT");

    console.log("--- STATUS END ---");
}

main().catch(console.error);
