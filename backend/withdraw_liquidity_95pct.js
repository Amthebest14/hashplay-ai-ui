require("dotenv").config({ path: "../.env" });
const {
    Client,
    AccountId,
    PrivateKey,
    Hbar,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    AccountBalanceQuery,
} = require("@hashgraph/sdk");

// Withdraws 95% of current liquidity from both PlayToken and ArenaV7 to the
// owner wallet. Computes the 95% figure from the LIVE balance at the moment
// this runs (not a hardcoded snapshot), since real buy/sell/game activity
// keeps changing both balances continuously.
//
// IMPORTANT unit difference between the two contracts, verified against
// source before writing this:
//   - PlayToken.withdrawHBAR(amount): amount is in WEI (18-decimal) --
//     the contract itself divides by 1e10 to get tinybars.
//   - ArenaV7.withdrawHBAR(amount): amount is in TINYBARS (8-decimal)
//     directly -- no conversion inside the contract.
const PLAY_TOKEN_ID = "0.0.10644208";
const ARENA_ID = "0.0.10644374";
const WITHDRAW_PCT = 95n;

async function main() {
    const accountId = process.env.DEPLOY_ACCOUNT_ID;
    const rawKey = process.env.OWNER_KEY;
    if (!accountId || !rawKey) {
        throw new Error("Set DEPLOY_ACCOUNT_ID and OWNER_KEY in .env before running.");
    }
    const cleanKey = rawKey.startsWith("0x") ? rawKey.substring(2) : rawKey;
    const ownerId = AccountId.fromString(accountId);
    const client = Client.forMainnet().setOperator(ownerId, PrivateKey.fromStringECDSA(cleanKey));
    client.setDefaultMaxTransactionFee(new Hbar(5));

    // --- PlayToken ---
    const playBalBefore = (await new AccountBalanceQuery().setAccountId(PLAY_TOKEN_ID).execute(client)).hbars.toTinybars();
    const playTinybars = BigInt(playBalBefore.toString());
    const playWithdrawTinybars = (playTinybars * WITHDRAW_PCT) / 100n;
    const playWithdrawWei = playWithdrawTinybars * 10_000_000_000n; // *1e10, contract expects wei

    console.log(`PlayToken current balance: ${Number(playTinybars) / 1e8} HBAR`);
    console.log(`Withdrawing 95%: ${Number(playWithdrawTinybars) / 1e8} HBAR`);

    const playTx = new ContractExecuteTransaction()
        .setContractId(PLAY_TOKEN_ID)
        .setGas(150_000)
        .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(playWithdrawWei.toString()));
    const playResp = await playTx.execute(client);
    const playReceipt = await playResp.getReceipt(client);
    console.log(`PlayToken withdrawal status: ${playReceipt.status.toString()}\n`);

    // --- ArenaV7 ---
    const arenaBalBefore = (await new AccountBalanceQuery().setAccountId(ARENA_ID).execute(client)).hbars.toTinybars();
    const arenaTinybars = BigInt(arenaBalBefore.toString());
    const arenaWithdrawTinybars = (arenaTinybars * WITHDRAW_PCT) / 100n;

    console.log(`ArenaV7 current balance: ${Number(arenaTinybars) / 1e8} HBAR`);
    console.log(`Withdrawing 95%: ${Number(arenaWithdrawTinybars) / 1e8} HBAR`);

    const arenaTx = new ContractExecuteTransaction()
        .setContractId(ARENA_ID)
        .setGas(150_000)
        .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(arenaWithdrawTinybars.toString()));
    const arenaResp = await arenaTx.execute(client);
    const arenaReceipt = await arenaResp.getReceipt(client);
    console.log(`ArenaV7 withdrawal status: ${arenaReceipt.status.toString()}\n`);

    // --- Final balances ---
    const playBalAfter = (await new AccountBalanceQuery().setAccountId(PLAY_TOKEN_ID).execute(client)).hbars.toString();
    const arenaBalAfter = (await new AccountBalanceQuery().setAccountId(ARENA_ID).execute(client)).hbars.toString();
    const ownerBalAfter = (await new AccountBalanceQuery().setAccountId(ownerId).execute(client)).hbars.toString();
    console.log(`PlayToken remaining liquidity: ${playBalAfter}`);
    console.log(`ArenaV7 remaining bankroll:    ${arenaBalAfter}`);
    console.log(`Owner wallet balance now:      ${ownerBalAfter}`);

    client.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
