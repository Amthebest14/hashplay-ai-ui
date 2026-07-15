require("dotenv").config({ path: "../.env" });
const fs = require("fs");
const path = require("path");
const {
    Client,
    AccountId,
    PrivateKey,
    Hbar,
    ContractCreateFlow,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    AccountBalanceQuery,
} = require("@hashgraph/sdk");

// Deploys HashplayArenaV7 (identical logic to V6) owned by DEPLOY_ACCOUNT_ID
// from the start — no compromised key involved. Constructor args:
//   _treasuryWallet: where the 5% loss fee goes (same as owner here)
//   _playToken:      the fixed PlayToken deployed earlier (0.0.10644208)
// After deploy it grants V7 minter rights on PlayToken so rewardPlayer()
// works, and optionally funds a starting bankroll (ARENA_BANKROLL_HBAR).
const PLAY_TOKEN_EVM = "0x0000000000000000000000000000000000a26af0"; // 0.0.10644208
const PLAY_TOKEN_ID = "0.0.10644208";
const ARENA_BANKROLL_HBAR = Number(process.env.ARENA_BANKROLL_HBAR || "0");

async function main() {
    const accountId = process.env.DEPLOY_ACCOUNT_ID;
    const rawKey = process.env.OWNER_KEY;
    if (!accountId || !rawKey) {
        throw new Error("Set DEPLOY_ACCOUNT_ID and OWNER_KEY in .env before running.");
    }
    const cleanKey = rawKey.startsWith("0x") ? rawKey.substring(2) : rawKey;
    const ownerId = AccountId.fromString(accountId);
    const privateKey = PrivateKey.fromStringECDSA(cleanKey);
    const client = Client.forMainnet().setOperator(ownerId, privateKey);
    // Kept modest on purpose: Hedera's payer-balance precheck demands the
    // account hold at least this cap, so an over-large cap needlessly blocks
    // deploys on a lightly funded wallet. Contract creation of this size has
    // run well under 15 HBAR.
    client.setDefaultMaxTransactionFee(new Hbar(15));

    const bal = await new AccountBalanceQuery().setAccountId(ownerId).execute(client);
    console.log(`Deployer/Owner: ${accountId}`);
    console.log(`Balance:        ${bal.hbars.toString()}\n`);

    // The treasury wallet must be the owner's real EVM alias (not the
    // long-zero form) so the 5% fee .call{value:} actually reaches the
    // account. Look it up via Mirror Node.
    let treasuryEvm = `0x${ownerId.toSolidityAddress()}`;
    try {
        const infoRes = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
        const info = await infoRes.json();
        if (info.evm_address) treasuryEvm = info.evm_address;
    } catch (e) {
        console.log(`[i] Could not fetch EVM alias, using long-zero. (${e.message})`);
    }
    console.log(`Treasury wallet: ${treasuryEvm}`);
    console.log(`PlayToken:       ${PLAY_TOKEN_EVM}\n`);

    const artifactPath = path.resolve(__dirname, "artifacts/contracts/HashplayArenaV7.sol/HashplayArenaV7.json");
    if (!fs.existsSync(artifactPath)) {
        console.error("Compile first with: npx hardhat compile");
        process.exit(1);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    console.log("Deploying HashplayArenaV7...");
    const constructorParams = new ContractFunctionParameters()
        .addAddress(treasuryEvm)
        .addAddress(PLAY_TOKEN_EVM);

    const createFlow = new ContractCreateFlow()
        .setBytecode(artifact.bytecode)
        .setGas(2_500_000)
        .setConstructorParameters(constructorParams);

    const createResponse = await createFlow.execute(client);
    const createReceipt = await createResponse.getReceipt(client);
    const arenaId = createReceipt.contractId;
    const arenaEvm = `0x${arenaId.toSolidityAddress()}`;

    console.log(`\n✅ ArenaV7 deployed at: ${arenaId.toString()} (${arenaEvm})`);
    console.log(`   HashScan: https://hashscan.io/mainnet/contract/${arenaId.toString()}`);

    // Grant V7 minter rights on PlayToken so rewardPlayer() succeeds.
    console.log(`\nGranting ArenaV7 minter rights on PlayToken...`);
    const setMinterTx = new ContractExecuteTransaction()
        .setContractId(PLAY_TOKEN_ID)
        .setGas(150_000)
        .setFunction("setMinter", new ContractFunctionParameters().addAddress(arenaEvm).addBool(true));
    const setMinterResp = await setMinterTx.execute(client);
    const setMinterReceipt = await setMinterResp.getReceipt(client);
    console.log(`✅ setMinter status: ${setMinterReceipt.status.toString()}`);

    if (ARENA_BANKROLL_HBAR > 0) {
        console.log(`\nFunding ArenaV7 bankroll with ${ARENA_BANKROLL_HBAR} HBAR...`);
        const fundTx = new ContractExecuteTransaction()
            .setContractId(arenaId)
            .setGas(100_000)
            .setPayableAmount(new Hbar(ARENA_BANKROLL_HBAR))
            .setFunction("fundBankroll");
        const fundResp = await fundTx.execute(client);
        const fundReceipt = await fundResp.getReceipt(client);
        console.log(`✅ Bankroll funded. Status: ${fundReceipt.status.toString()}`);
    } else {
        console.log(`\n[i] No bankroll funded (ARENA_BANKROLL_HBAR not set). Fund later by sending`);
        console.log(`    HBAR to ${arenaId.toString()} or calling fundBankroll().`);
    }

    const config = { ARENA_V7_ADDRESS: arenaEvm, ARENA_V7_CONTRACT_ID: arenaId.toString() };
    fs.writeFileSync(path.resolve(__dirname, "arena_v7_config.json"), JSON.stringify(config, null, 2));
    console.log(`\nAddress saved to arena_v7_config.json`);
    console.log(`\nNext step (not automated): update VITE_MINING_ENGINE_ADDRESS /`);
    console.log(`the fallback address in src/services to ${arenaEvm}, then merge & redeploy.`);

    client.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
