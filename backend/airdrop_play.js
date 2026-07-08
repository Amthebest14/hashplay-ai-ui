require("dotenv").config({ path: "../.env" });
const { ethers }                    = require("ethers");
const { Client, PrivateKey, AccountId, ContractId, ContractExecuteTransaction, ContractFunctionParameters } = require("@hashgraph/sdk");

const ARENA_CONTRACT  = "0.0.10420650";   // HashplayArenaV5 — XP source
const PLAY_TOKEN      = "0.0.10628895";   // $PLAY bonding curve token
const OWNER_ID        = "0.0.10627830";
const AIRDROP_POOL    = 10_000_000n;      // 10M PLAY
const TOKEN_DECIMALS  = 8n;
const BATCH_SIZE      = 50;

const ARENA_ABI = [
    "function getPlayerCount() external view returns (uint256)",
    "function playerIndex(uint256) external view returns (address)",
    "function playerXP(address) external view returns (uint256)"
];

async function main() {
    // ── Step 1: Fetch all players + XP ──────────────────────────────────────
    console.log("Step 1: Fetching player XP from HashplayArenaV5...\n");
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const arena    = new ethers.Contract(
        "0xcec25013eCE3eC5a1b090261880eb2aeB7ffb9c8", // EVM address of ARENA_CONTRACT
        ARENA_ABI, provider
    );

    const playerCount = Number(await arena.getPlayerCount());
    console.log(`Total players: ${playerCount}`);

    const players = [];
    const FETCH_BATCH = 10;
    const retry = async (fn, retries = 4, delay = 1500) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try { return await fn(); }
            catch (e) {
                if (attempt === retries) throw e;
                await new Promise(r => setTimeout(r, delay));
            }
        }
    };
    for (let i = 0; i < playerCount; i += FETCH_BATCH) {
        const end   = Math.min(i + FETCH_BATCH, playerCount);
        const addrs = await retry(() => Promise.all(Array.from({length: end - i}, (_, k) => arena.playerIndex(i + k))));
        const xps   = await retry(() => Promise.all(addrs.map(a => arena.playerXP(a))));
        for (let j = 0; j < addrs.length; j++) {
            players.push({ address: addrs[j], xp: BigInt(xps[j].toString()) });
        }
        process.stdout.write(`  Fetched ${Math.min(i + FETCH_BATCH, playerCount)}/${playerCount}...\r`);
        await new Promise(r => setTimeout(r, 200));
    }
    console.log(`\nFetch complete.\n`);

    // ── Step 2: Calculate airdrop amounts ────────────────────────────────────
    const totalXP     = players.reduce((s, p) => s + p.xp, 0n);
    const poolUnits   = AIRDROP_POOL * (10n ** TOKEN_DECIMALS); // 10M PLAY in token base units

    const airdropList = players.map(p => ({
        address:    p.address,
        xp:         p.xp,
        playAmount: (p.xp * poolUnits) / totalXP
    })).filter(p => p.playAmount > 0n);

    const totalMinted = airdropList.reduce((s, p) => s + p.playAmount, 0n);
    console.log(`Total XP:          ${totalXP.toLocaleString()}`);
    console.log(`Total PLAY minted: ${(totalMinted / (10n ** TOKEN_DECIMALS)).toLocaleString()} PLAY`);
    console.log(`Players receiving: ${airdropList.length}\n`);

    // ── Step 3: Connect Hedera SDK as owner ──────────────────────────────────
    const privateKey = PrivateKey.fromString(process.env.OWNER_KEY);
    const accountId  = AccountId.fromString(OWNER_ID);
    const client     = Client.forMainnet();
    client.setOperator(accountId, privateKey);

    const contractId = ContractId.fromString(PLAY_TOKEN);

    // ── Step 4: Batch airdrop ────────────────────────────────────────────────
    const batches     = Math.ceil(airdropList.length / BATCH_SIZE);
    let totalSuccess  = 0;

    console.log(`Sending ${batches} batches of up to ${BATCH_SIZE} players each...\n`);

    for (let b = 0; b < batches; b++) {
        const slice    = airdropList.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
        const addrs    = slice.map(p => p.address);
        const amounts  = slice.map(p => p.playAmount);
        const xpSnaps  = slice.map(p => p.xp);

        const params = new ContractFunctionParameters()
            .addAddressArray(addrs)
            .addUint256Array(amounts.map(a => a.toString()))
            .addUint256Array(xpSnaps.map(x => x.toString()));

        try {
            const tx = new ContractExecuteTransaction()
                .setContractId(contractId)
                .setGas(5_000_000)
                .setFunction("batchAirdrop", params);

            const response = await tx.execute(client);
            const receipt  = await response.getReceipt(client);

            totalSuccess += slice.length;
            console.log(`  Batch ${b + 1}/${batches} ✅  ${slice.length} players | Status: ${receipt.status} | Tx: ${response.transactionId.toString()}`);
        } catch(e) {
            console.error(`  Batch ${b + 1}/${batches} ❌  Error: ${e.message}`);
        }

        // Small delay between batches to avoid rate limiting
        if (b < batches - 1) await new Promise(r => setTimeout(r, 1500));
    }

    console.log(`\n✅ Airdrop complete!`);
    console.log(`   Players airdropped: ${totalSuccess}/${airdropList.length}`);
    console.log(`   Total PLAY distributed: ${(totalMinted / (10n ** TOKEN_DECIMALS)).toLocaleString()} PLAY`);
    console.log(`   View token: https://hashscan.io/mainnet/contract/0.0.10628895`);

    client.close();
}

main().catch(console.error);
