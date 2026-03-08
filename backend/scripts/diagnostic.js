const { Client, AccountBalanceQuery, ContractId, TokenId, AccountId } = require("@hashgraph/sdk");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID);
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V1_ID = "0.0.8103703"; // Identified as the old game contract
    const V2_HEX = "0x789b9F3977508488FDDcCa5570a662080528";
    const TOKEN_ID = process.env.VITE_HASHPLAY_TOKEN_ID;

    console.log("--- DIAGNOSTIC START ---");

    async function checkBalance(id, label) {
        try {
            const balance = await new AccountBalanceQuery().setAccountId(id).execute(client);
            console.log(`${label} (${id}):`);
            console.log(`  HBAR: ${balance.hbars.toString()}`);
            const tokenBalance = balance.tokens.get(TokenId.fromString(TOKEN_ID)) || 0;
            console.log(`  $HASH: ${tokenBalance.toString()}`);
        } catch (e) {
            console.log(`${label} (${id}) ERROR: ${e.message}`);
        }
    }

    await checkBalance(operatorId, "TREASURY");
    await checkBalance(V1_ID, "V1_CONTRACT");

    // For V2, we might need to find the ID first
    // Note: 0.0.8119191 was seen in mirror node logs related to V2 HEX
    await checkBalance("0.0.8119191", "POTENTIAL_V2_ID");

    console.log("--- DIAGNOSTIC END ---");
}

main().catch(console.error);
