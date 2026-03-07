const { ethers } = require("hardhat");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

async function main() {
    const TOKEN_ID = process.env.VITE_HASHPLAY_TOKEN_ID;
    const tokenEvmAddress = ethers.getAddress("0x" + Number(TOKEN_ID.split(".")[2]).toString(16).padStart(40, "0"));
    // Actually, I'll use a more reliable way to get the EVM address if possible, 
    // but the ID 0.0.8076828 maps to a specific hex.
    // Let's just use the known hex for 0.0.8076828:
    const hashplayTokenAddress = "0x00000000000000000000000000000000007b3e1c";
    // 8076828 in hex is 7B3E1C

    console.log("Deploying HashplayArenaV2 with Token:", TOKEN_ID, "(", hashplayTokenAddress, ")");

    const ArenaV2 = await ethers.getContractFactory("HashplayArenaV2");
    const arena = await ArenaV2.deploy(hashplayTokenAddress);

    await arena.waitForDeployment();
    const address = await arena.getAddress();

    console.log("HashplayArenaV2 deployed to:", address);

    // Save address for next steps
    console.log("---DEPLOYS_START---");
    console.log(`ARENA_V2_ADDRESS=${address}`);
    console.log("---DEPLOYS_END---");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
