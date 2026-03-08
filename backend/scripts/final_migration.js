const { Client, AccountBalanceQuery, ContractId, TokenId, AccountId, ContractExecuteTransaction, Hbar, TokenAssociateTransaction, TransferTransaction, ContractFunctionParameters } = require("@hashgraph/sdk");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "../.env") });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID);
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V1_ID = "0.0.8103703";
    const V2_ID = "0.0.8119191";
    const TOKEN_ID = process.env.VITE_HASHPLAY_TOKEN_ID;

    console.log("--- FINAL MIGRATION START ---");

    // 1. DRAIN V1 (HBAR & TOKENS)
    console.log("Checking V1 Balance...");
    const v1B = await new AccountBalanceQuery().setAccountId(V1_ID).execute(client);
    const tb = v1B.hbars.toTinybars();
    const tok = v1B.tokens.get(TokenId.fromString(TOKEN_ID)) || 0n;

    console.log(`V1 holds ${tb.toString()} tinybars (~${v1B.hbars.toString()})`);
    console.log(`V1 holds ${tok.toString()} tokens (~898k)`);

    if (tb.gt(0)) {
        console.log("Withdrawing HBAR from V1...");
        // Use tinybars directly for uint256 parameter
        const tx = await new ContractExecuteTransaction()
            .setContractId(V1_ID)
            .setGas(1000000)
            .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(tb.toString()))
            .execute(client);
        await tx.getReceipt(client);
        console.log("HBAR successfully withdrawn to Treasury.");
    }

    if (tok > 0n) {
        console.log("Withdrawing Tokens from V1...");
        const tx = await new ContractExecuteTransaction()
            .setContractId(V1_ID)
            .setGas(1000000)
            .setFunction("withdrawTokens", new ContractFunctionParameters().addUint256(tok.toString()))
            .execute(client);
        await tx.getReceipt(client);
        console.log("Tokens successfully withdrawn to Treasury.");
    }

    // 2. ASSOCIATE V2 (Safe Check)
    console.log("Ensuring V2 is associated...");
    try {
        const associateTx = await new TokenAssociateTransaction()
            .setAccountId(V2_ID)
            .setTokenIds([TokenId.fromString(TOKEN_ID)])
            .execute(client);
        await associateTx.getReceipt(client);
        console.log("V2 association confirmed.");
    } catch (e) {
        console.log("V2 already associated.");
    }

    // 3. FUND V2
    console.log("Funding V2 Bankroll...");
    const fundHbar = new Hbar(2800);
    const fundToken = 2080000000000000n; // 20.8M (8 decimals)

    const transferTx = await new TransferTransaction()
        .addHbarTransfer(operatorId, fundHbar.negated())
        .addHbarTransfer(V2_ID, fundHbar)
        .addTokenTransfer(TokenId.fromString(TOKEN_ID), operatorId, -fundToken)
        .addTokenTransfer(TokenId.fromString(TOKEN_ID), V2_ID, fundToken)
        .execute(client);
    await transferTx.getReceipt(client);

    console.log("V2 Bankroll Funded: 2,800 HBAR + 20.8M $HASHPLAY");
    console.log("--- MIGRATION COMPLETE ---");
}

main().catch(console.error);
