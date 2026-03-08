const { Client, AccountBalanceQuery, ContractId, TokenId, AccountId, ContractExecuteTransaction, Hbar, TokenAssociateTransaction, TransferTransaction, ContractFunctionParameters } = require("@hashgraph/sdk");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID);
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V1_ID = "0.0.8103703";
    const V2_ID = "0.0.8119191";
    const TOKEN_ID = process.env.VITE_HASHPLAY_TOKEN_ID;

    console.log("--- FINAL MIGRATION (CORRECT DECIMALS) ---");

    // 1. DRAIN V1
    const v1B = await new AccountBalanceQuery().setAccountId(V1_ID).execute(client);
    const tb = v1B.hbars.toTinybars();
    const tok = v1B.tokens.get(TokenId.fromString(TOKEN_ID)) || 0n;

    console.log(`Draining V1 (${V1_ID}): ${tb.toString()} tHBAR, ${tok.toString()} $HASH`);

    if (tb.gt(0)) {
        console.log("Withdrawing HBAR...");
        // Use tinybars directly (8 decimals)
        const tx = await new ContractExecuteTransaction()
            .setContractId(V1_ID)
            .setGas(1000000)
            .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(tb.toString()))
            .execute(client);
        await tx.getReceipt(client);
        console.log("HBAR Relocated.");
    }

    if (tok > 0n) {
        console.log("Withdrawing Tokens...");
        const tx = await new ContractExecuteTransaction()
            .setContractId(V1_ID)
            .setGas(1000000)
            .setFunction("withdrawTokens", new ContractFunctionParameters().addUint256(tok.toString()))
            .execute(client);
        await tx.getReceipt(client);
        console.log("Tokens Relocated.");
    }

    // 2. FUND V2
    console.log("Funding V2...");
    // We want 2800 HBAR and 20.8M tokens in V2
    const fundH = new Hbar(2800);
    const fundT = 2080000000000000n; // 20.8M

    const transferTx = await new TransferTransaction()
        .addHbarTransfer(operatorId, fundH.negated())
        .addHbarTransfer(V2_ID, fundH)
        .addTokenTransfer(TokenId.fromString(TOKEN_ID), operatorId, -fundT)
        .addTokenTransfer(TokenId.fromString(TOKEN_ID), V2_ID, fundT)
        .execute(client);
    await transferTx.getReceipt(client);

    console.log("V2 Bankroll Seeded.");
    console.log("--- SUCCESS ---");
}

main().catch(console.error);
