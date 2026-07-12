require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const NEW_OWNER = "0x0000000000000000000000000000000000A22AF6"; // 0.0.10627830
const AIRDROP_POOL = 10_000_000n; // 10M PLAY
const TOKEN_DECIMALS = 8n;
const BATCH_SIZE = 50;
const CONTRACT_ADDRESS = "0x165C38e572B6B8b0c2A29e4150a57072bD31e37D";

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(process.env.OWNER_KEY, provider);

    const artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, "artifacts/contracts/PlayToken.sol/PlayToken.json"), "utf8"));
    const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, wallet);

    console.log(`\n=== 1. Restoring Final Batch of Airdrop Wallets ===`);
    const seasonData = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../src/data/season1.json"), "utf8"));
    const players = seasonData.map(p => ({ address: p.account, xp: BigInt(p.xp) }));
    
    const totalXP = players.reduce((s, p) => s + p.xp, 0n);
    const poolUnits = AIRDROP_POOL * (10n ** TOKEN_DECIMALS);
    
    const airdropList = players.map(p => ({
        address: p.address,
        xp: p.xp,
        playAmount: (p.xp * poolUnits) / totalXP
    })).filter(p => p.playAmount > 0n);
    
    const batches = Math.ceil(airdropList.length / BATCH_SIZE);
    
    // ONLY RUN THE LAST BATCH (index 8)
    const b = 8;
    const slice = airdropList.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const addrs = slice.map(p => p.address);
    const amounts = slice.map(p => p.playAmount);
    const xpSnaps = slice.map(p => p.xp);

    try {
        const tx = await contract.batchAirdrop(addrs, amounts, xpSnaps, { gasLimit: 2_000_000 });
        await tx.wait();
        console.log(`  Batch ${b + 1}/${batches} ✅ ${slice.length} players restored.`);
    } catch(e) {
        console.error(`  Batch ${b + 1}/${batches} ❌ Error: ${e.message}`);
    }

    const supply = await contract.totalSupply();
    console.log(`\n=== RESTORE COMPLETE ===`);
    console.log(`Total Supply: ${ethers.formatUnits(supply, 8)} PLAY`);
}

main().catch(console.error);
