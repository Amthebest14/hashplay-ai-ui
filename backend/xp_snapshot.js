const { ethers } = require("ethers");

const CONTRACT = "0xcec25013eCE3eC5a1b090261880eb2aeB7ffb9c8"; // HashplayArenaV5
const RPC = "https://mainnet.hashio.io/api";
const AIRDROP_POOL = 10_000_000; // 10M PLAY

const ABI = [
    "function getPlayerCount() external view returns (uint256)",
    "function playerIndex(uint256) external view returns (address)",
    "function playerXP(address) external view returns (uint256)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC);
    const contract = new ethers.Contract(CONTRACT, ABI, provider);

    const playerCount = await contract.getPlayerCount();
    console.log(`\nTotal players on-chain: ${playerCount}`);
    console.log(`Fetching XP for all players...\n`);

    const players = [];

    // Fetch in batches of 20 to avoid timeout
    const BATCH = 20;
    for (let i = 0; i < playerCount; i += BATCH) {
        const end = Math.min(Number(i) + BATCH, Number(playerCount));
        const batch = [];
        for (let j = i; j < end; j++) {
            batch.push(contract.playerIndex(j));
        }
        const addresses = await Promise.all(batch);
        const xpBatch = await Promise.all(addresses.map(a => contract.playerXP(a)));
        for (let k = 0; k < addresses.length; k++) {
            players.push({ address: addresses[k], xp: Number(xpBatch[k]) });
        }
        process.stdout.write(`  Fetched ${Math.min(Number(i) + BATCH, Number(playerCount))}/${playerCount}...\r`);
    }

    // Sort by XP descending
    players.sort((a, b) => b.xp - a.xp);

    const totalXP = players.reduce((sum, p) => sum + p.xp, 0);
    console.log(`\n\nTotal XP across all players: ${totalXP.toLocaleString()} XP`);
    console.log(`Airdrop pool: ${AIRDROP_POOL.toLocaleString()} PLAY\n`);

    console.log(`${"Rank".padEnd(6)}${"Address".padEnd(44)}${"XP".padEnd(15)}${"PLAY Airdrop".padEnd(18)}${"% of Pool"}`);
    console.log("─".repeat(95));

    players.slice(0, 10).forEach((p, i) => {
        const playAmount = Math.round((p.xp / totalXP) * AIRDROP_POOL);
        const pct = ((p.xp / totalXP) * 100).toFixed(3);
        console.log(`#${String(i+1).padEnd(5)}${p.address.padEnd(44)}${p.xp.toLocaleString().padEnd(15)}${playAmount.toLocaleString().padEnd(18)}${pct}%`);
    });

    const top10XP = players.slice(0, 10).reduce((s, p) => s + p.xp, 0);
    const top10Play = Math.round((top10XP / totalXP) * AIRDROP_POOL);
    console.log("─".repeat(95));
    console.log(`${"Top 10 Total".padEnd(50)}${top10XP.toLocaleString().padEnd(15)}${top10Play.toLocaleString().padEnd(18)}${((top10XP/totalXP)*100).toFixed(2)}%`);
    console.log(`\nRemaining ${playerCount - 10} players share: ${(AIRDROP_POOL - top10Play).toLocaleString()} PLAY`);
}

main().catch(console.error);
