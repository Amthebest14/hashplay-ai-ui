const { Client, AccountBalanceQuery, ContractId, TokenId, AccountId, ContractExecuteTransaction, Hbar, TokenAssociateTransaction, TransferTransaction, ContractFunctionParameters } = require("@hashgraph/sdk");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID);
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V1_ID = "0.0.8103703";
    const V2_ID = "0.0.8119191"; // Resolved newest contract
    const TOKEN_ID = process.env.VITE_HASHPLAY_TOKEN_ID;

    console.log("--- SDK RECOVERY START ---");

    // 1. GET V1 BALANCES
    const v1Balance = await new AccountBalanceQuery().setAccountId(V1_ID).execute(client);
    console.log(`V1 HBAR: ${v1Balance.hbars.toString()}`);
    const v1TokenBalance = v1Balance.tokens.get(TokenId.fromString(TOKEN_ID)) || 0n;
    console.log(`V1 $HASH: ${v1TokenBalance.toString()}`);

    // 2. WITHDRAW HBAR FROM V1
    if (v1Balance.hbars.toTinybars().gt(0)) {
        console.log("Withdrawing HBAR...");
        // In the contract, amount is uint256 with 18 decimals for HBAR
        const amountWei = v1Balance.hbars.toTinybars().multipliedBy(1e10); // 10^8 * 10^10 = 10^18
        const tx = await new ContractExecuteTransaction()
            .setContractId(V1_ID)
            .setGas(1000000)
            .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(amountWei.toString()))
            .execute(client);
        await tx.getReceipt(client);
        console.log("HBAR Withdrawn to Treasury.");
    }

    // 3. WITHDRAW TOKENS FROM V1
    if (v1TokenBalance > 0n) {
        console.log("Withdrawing Tokens...");
        const tx = await new ContractExecuteTransaction()
            .setContractId(V1_ID)
            .setGas(1000000)
            .setFunction("withdrawTokens", new ContractFunctionParameters().addUint256(v1TokenBalance.toString()))
            .execute(client);
        await tx.getReceipt(client);
        console.log("Tokens Withdrawn to Treasury.");
    }

    // 4. ASSOCIATE V2
    console.log("Checking V2 Association...");
    try {
        const associateTx = await new TokenAssociateTransaction()
            .setAccountId(V2_ID)
            .setTokenIds([TokenId.fromString(TOKEN_ID)])
            .execute(client);
        await associateTx.getReceipt(client);
        console.log("V2 Associated successfully.");
    } catch (e) {
        console.log("V2 association skipped (likely already associated).");
    }

    // 5. FUND V2
    console.log("Funding V2...");
    const treasuryBalance = await new AccountBalanceQuery().setAccountId(operatorId).execute(client);
    console.log(`Treasury Balance Now: ${treasuryBalance.hbars.toString()}`);

    // We want to seed V2 with 2800 HBAR and 20.8M tokens
    const fundHbar = new Hbar(2800);
    const fundTokens = 2080000000000000n; // 20.8M (8 decimals)

    const transferTx = await new TransferTransaction()
        .addHbarTransfer(operatorId, fundHbar.negated())
        .addHbarTransfer(V2_ID, fundHbar)
        .addTokenTransfer(TokenId.fromString(TOKEN_ID), operatorId, -fundTokens)
        .addTokenTransfer(TokenId.fromString(TOKEN_ID), V2_ID, fundTokens)
        .execute(client);
    await transferTx.getReceipt(client);

    console.log("V2 Funded with 2800 HBAR and 20.8M tokens.");
    console.log("--- RECOVERY SUCCESSFUL ---");
}

main().catch(console.error);
