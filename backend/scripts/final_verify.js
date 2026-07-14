require("dotenv").config({ path: "../.env" });
const { Client, AccountId, TokenId, AccountBalanceQuery, PrivateKey } = require("@hashgraph/sdk");

async function main() {
    const operatorId = AccountId.fromString(process.env.TESTNET_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.TESTNET_OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V2_ID = AccountId.fromString("0.0.8119191");
    const TOKEN_ID = TokenId.fromString("0.0.8076828");

    console.log("--- FINAL BALANCE VERIFICATION ---");

    const tBal = await new AccountBalanceQuery().setAccountId(operatorId).execute(client);
    const v2Bal = await new AccountBalanceQuery().setAccountId(V2_ID).execute(client);

    console.log(`Treasury (${operatorId}):`);
    console.log(`  HBAR: ${tBal.hbars.toString()}`);
    console.log(`  $HASH: ${(tBal.tokens.get(TOKEN_ID) || 0n).toString()}`);

    console.log(`V2 Contract (0.0.8119191):`);
    console.log(`  HBAR: ${v2Bal.hbars.toString()}`);
    console.log(`  $HASH: ${(v2Bal.tokens.get(TOKEN_ID) || 0n).toString()}`);
}

main().catch(console.error);
