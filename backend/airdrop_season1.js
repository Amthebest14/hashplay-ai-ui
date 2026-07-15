require("dotenv").config({ path: "../.env" });
const fs = require("fs");
const path = require("path");
const {
    Client,
    AccountId,
    PrivateKey,
    Hbar,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    AccountBalanceQuery,
} = require("@hashgraph/sdk");

// Airdrops 20,000,000 PLAY total across every Season 1 wallet, proportional
// to each wallet's XP share (their_xp / total_xp * 20,000,000). Batches of
// ~50 recipients per transaction to stay under Hedera's per-tx size limits.
const CONTRACT_ID = process.env.PLAYTOKEN_CONTRACT_ID || "0.0.10644208";
const TOTAL_AIRDROP_PLAY = 20_000_000;
const PLAY_DECIMALS = 100_000_000n; // 1e8
const BATCH_SIZE = 50;
const DRY_RUN = process.env.DRY_RUN === "true";

function loadAllocations() {
    const snapshotPath = path.resolve(__dirname, "../src/data/season1.json");
    const wallets = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));

    const totalXp = wallets.reduce((sum, w) => sum + w.xp, 0);
    const totalAirdropSmallestUnits = BigInt(TOTAL_AIRDROP_PLAY) * PLAY_DECIMALS;

    let allocated = 0n;
    const allocations = wallets.map((w) => {
        const amount = (BigInt(w.xp) * totalAirdropSmallestUnits) / BigInt(totalXp);
        allocated += amount;
        return { account: w.account, xp: w.xp, amount };
    });

    // Integer division leaves a small remainder unallocated (dust) — give it
    // to the top XP holder so the total mints out to exactly 20,000,000 PLAY.
    const remainder = totalAirdropSmallestUnits - allocated;
    if (remainder > 0n) {
        const top = allocations.reduce((a, b) => (b.xp > a.xp ? b : a));
        top.amount += remainder;
    }

    return { allocations, totalXp };
}

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

async function main() {
    const { allocations, totalXp } = loadAllocations();
    const totalCheck = allocations.reduce((sum, a) => sum + a.amount, 0n);

    console.log(`Wallets:        ${allocations.length}`);
    console.log(`Total XP:       ${totalXp}`);
    console.log(`Total to mint:  ${(Number(totalCheck) / 1e8).toLocaleString()} PLAY`);
    console.log(`Top allocation: ${allocations.reduce((a, b) => (b.amount > a.amount ? b : a)).account} -> ${(Number(allocations.reduce((a, b) => (b.amount > a.amount ? b : a)).amount) / 1e8).toLocaleString()} PLAY`);

    const batches = chunk(allocations, BATCH_SIZE);
    console.log(`Batches:        ${batches.length} (size ${BATCH_SIZE})\n`);

    if (DRY_RUN) {
        console.log("[DRY_RUN=true] Not sending any transactions. Allocations computed above look correct? Re-run without DRY_RUN to execute.");
        return;
    }

    const accountId = process.env.DEPLOY_ACCOUNT_ID;
    const rawKey = process.env.OWNER_KEY;
    if (!accountId || !rawKey) {
        throw new Error("Set DEPLOY_ACCOUNT_ID and OWNER_KEY in .env before running for real.");
    }
    const cleanKey = rawKey.startsWith("0x") ? rawKey.substring(2) : rawKey;
    const ownerId = AccountId.fromString(accountId);
    const client = Client.forMainnet().setOperator(ownerId, PrivateKey.fromStringECDSA(cleanKey));
    // Hedera's payer-balance precheck requires the account to hold at least
    // this cap, not just the real cost — the same issue that broke the
    // original deploy attempt. Observed real cost per 50-wallet batch has
    // been ~1.78 HBAR, so 20 HBAR was demanding far more headroom than
    // actually needed and rejecting batches on accounts with less than 20
    // HBAR even though they had enough for the real fee.
    client.setDefaultMaxTransactionFee(new Hbar(4));

    // RETRY_BATCHES=3,4 runs only those 1-indexed batches, so a partial
    // failure never re-mints already-succeeded batches.
    const retryList = process.env.RETRY_BATCHES
        ? process.env.RETRY_BATCHES.split(",").map((n) => parseInt(n.trim(), 10))
        : null;

    const failedBatches = [];
    let totalFeeTinybars = 0n;

    for (let i = 0; i < batches.length; i++) {
        const batchNumber = i + 1;
        if (retryList && !retryList.includes(batchNumber)) continue;

        const batch = batches[i];
        const balBefore = (await new AccountBalanceQuery().setAccountId(ownerId).execute(client)).hbars.toTinybars();

        console.log(`Batch ${batchNumber}/${batches.length} (${batch.length} wallets)...`);
        try {
            const params = new ContractFunctionParameters()
                .addAddressArray(batch.map((b) => b.account))
                .addUint256Array(batch.map((b) => b.amount.toString()))
                .addUint256Array(batch.map((b) => b.xp.toString()));

            const tx = new ContractExecuteTransaction()
                .setContractId(CONTRACT_ID)
                .setGas(6_000_000)
                .setFunction("batchAirdrop", params);

            const response = await tx.execute(client);
            const receipt = await response.getReceipt(client);
            console.log(`  Status: ${receipt.status.toString()}`);
        } catch (err) {
            console.error(`  [!] Batch ${i + 1} failed: ${err.message}`);
            failedBatches.push(i + 1);
        }

        const balAfter = (await new AccountBalanceQuery().setAccountId(ownerId).execute(client)).hbars.toTinybars();
        const feeTinybars = balBefore.subtract(balAfter);
        totalFeeTinybars += BigInt(feeTinybars.toString());
        console.log(`  Fee for this batch: ${(Number(feeTinybars.toString()) / 1e8).toFixed(4)} HBAR\n`);
    }

    console.log(`\nTotal spent on fees: ${(Number(totalFeeTinybars) / 1e8).toFixed(4)} HBAR`);
    if (failedBatches.length > 0) {
        console.log(`\n[!] Failed batches (retry these): ${failedBatches.join(", ")}`);
    } else {
        console.log(`\n✅ All ${batches.length} batches completed successfully.`);
    }

    client.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
