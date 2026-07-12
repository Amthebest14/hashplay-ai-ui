require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const NEW_OWNER = "0x0000000000000000000000000000000000A22AF6"; // 0.0.10627830
const AIRDROP_POOL = 10_000_000n; // 10M PLAY
const TREASURY_POOL = 10_000_000n; // 10M PLAY for Treasury
const TOKEN_DECIMALS = 8n;
const BATCH_SIZE = 50;

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);

    console.log(`\n=== 1. Deploying FINAL PlayToken ===`);
    const artifact = JSON.parse(fs.readFileSync(path.resolve(__dirname, "artifacts/contracts/PlayToken.sol/PlayToken.json"), "utf8"));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    // Deploy contract
    const contract = await factory.deploy({ gasLimit: 3_000_000 });
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`✅ $PLAY deployed at: ${address}`);

    // Seed 10 HBAR liquidity
    console.log(`\n=== 2. Seeding 10 HBAR Liquidity ===`);
    const seedTx = await contract.seedLiquidity({ value: ethers.parseEther("10"), gasLimit: 100_000 });
    await seedTx.wait();
    console.log(`✅ 10 HBAR seeded. Tx: ${seedTx.hash}`);

    // Airdrop 10M to 426 wallets
    console.log(`\n=== 3. Restoring 426 Airdrop Wallets ===`);
    const seasonData = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../src/data/season1.json"), "utf8"));
    const players = seasonData.map(p => ({ address: p.account, xp: BigInt(p.xp) }));
    
    const totalXP = players.reduce((s, p) => s + p.xp, 0n);
    const poolUnits = AIRDROP_POOL * (10n ** TOKEN_DECIMALS);
    
    const airdropList = players.map(p => ({
        address: p.address,
        xp: p.xp,
        playAmount: (p.xp * poolUnits) / totalXP
    })).filter(p => p.playAmount > 0n);

    console.log(`Total PLAY for community: ${(airdropList.reduce((s, p) => s + p.playAmount, 0n) / (10n ** TOKEN_DECIMALS)).toLocaleString()}`);
    
    const batches = Math.ceil(airdropList.length / BATCH_SIZE);
    for (let b = 0; b < batches; b++) {
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
    }

    // Mint 10M to Treasury
    console.log(`\n=== 4. Restoring Treasury Balance ===`);
    const treasuryUnits = TREASURY_POOL * (10n ** TOKEN_DECIMALS);
    const treasuryTx = await contract.airdrop(NEW_OWNER, treasuryUnits, 0n, { gasLimit: 500_000 });
    await treasuryTx.wait();
    console.log(`✅ 10,000,000 PLAY minted to Treasury.`);

    // Transfer Ownership
    console.log(`\n=== 5. Transferring Ownership to Treasury ===`);
    const ownerTx = await contract.transferOwnership(NEW_OWNER, { gasLimit: 100_000 });
    await ownerTx.wait();
    console.log(`✅ Ownership transferred to ${NEW_OWNER}`);

    // Update config
    const config = { PLAY_TOKEN_ADDRESS: address };
    fs.writeFileSync(path.resolve(__dirname, "play_token_config.json"), JSON.stringify(config, null, 2));
    
    const supply = await contract.totalSupply();
    console.log(`\n=== RESTORE COMPLETE ===`);
    console.log(`Total Supply: ${ethers.formatUnits(supply, 8)} PLAY`);
    console.log(`Contract: ${address}`);
}

main().catch(console.error);
