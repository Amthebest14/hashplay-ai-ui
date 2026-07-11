const fs = require('fs');
const { ethers } = require('ethers');

const ARENA_ABI = [
    "function getPlayerCount() external view returns (uint256)",
    "function playerIndex(uint256) external view returns (address)",
    "function playerXP(address) external view returns (uint256)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const arena    = new ethers.Contract(
        "0xcec25013eCE3eC5a1b090261880eb2aeB7ffb9c8", // HashplayArenaV5 EVM address
        ARENA_ABI, provider
    );

    const playerCount = Number(await arena.getPlayerCount());
    console.log(`Total players: ${playerCount}`);

    const players = [];
    const retry = async (fn, retries = 4, delay = 1500) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try { return await fn(); }
            catch (e) {
                if (attempt === retries) throw e;
                await new Promise(r => setTimeout(r, delay));
            }
        }
    };

    const FETCH_BATCH = 50;
    for (let i = 0; i < playerCount; i += FETCH_BATCH) {
        const batchEnd = Math.min(i + FETCH_BATCH, playerCount);
        const promises = [];
        for (let j = i; j < batchEnd; j++) {
            promises.push(retry(async () => {
                const addr = await arena.playerIndex(j);
                const xp   = await arena.playerXP(addr);
                return { address: addr, xp: Number(xp) };
            }));
        }
        const results = await Promise.all(promises);
        players.push(...results);
        process.stdout.write(`  Fetched ${players.length}/${playerCount}...\r`);
    }

    console.log("\nSorting and saving...");
    players.sort((a, b) => b.xp - a.xp);

    // Map `address` to `account` format for the Leaderboard UI compatibility
    const uiData = players.map(p => ({
        account: p.address,
        xp: p.xp
    }));

    fs.mkdirSync('../src/data', {recursive: true});
    fs.writeFileSync('../src/data/season1.json', JSON.stringify(uiData, null, 2));
    console.log('Saved to src/data/season1.json');
}

main().catch(console.error);
