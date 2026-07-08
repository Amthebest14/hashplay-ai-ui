const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const TREASURY_WALLET = "0x0000000000000000000000000000000000A22AF6"; // 0.0.10627830
const PLAY_TOKEN      = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";

async function main() {
    console.log("Deploying HashplayArenaV6...");

    const ArenaV6 = await ethers.getContractFactory("HashplayArenaV6");
    const arena = await ArenaV6.deploy(TREASURY_WALLET, PLAY_TOKEN, { value: 0, gasLimit: 1_000_000 }); // Seed 0 HBAR bankroll

    await arena.waitForDeployment();
    const address = await arena.getAddress();
    console.log(`✅ ArenaV6 deployed at: ${address}`);

    // Update config
    const configPath = path.resolve(__dirname, "../src/config.json");
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        config.ARENA_ADDRESS = address;
        config.PLAY_TOKEN_ADDRESS = PLAY_TOKEN;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log("✅ Updated frontend config.json");
    } else {
        console.log("Frontend config.json not found, skipping update.");
    }

    console.log("\nNext Steps:");
    console.log(`1. Call setMinter('${address}', true) on PlayToken`);
}

main().catch(console.error);
