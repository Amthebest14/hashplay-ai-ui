const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Deploying HashplayGame to Hedera Testnet...");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "HBAR");

    // $HASHPLAY token EVM address (convert 0.0.8076828 to EVM format)
    // 0.0.8076828 in hex: 8076828 = 0x7B4D1C → pad to 40 chars
    const tokenDecimalId = 8076828;
    const tokenHex = tokenDecimalId.toString(16).padStart(40, '0');
    const hashplayTokenAddress = ethers.getAddress('0x' + tokenHex);
    console.log("$HASHPLAY Token EVM Address:", hashplayTokenAddress);

    const HashplayGame = await ethers.getContractFactory("HashplayGame");
    const game = await HashplayGame.deploy(hashplayTokenAddress, {
        gasLimit: 4000000
    });

    await game.waitForDeployment();
    const contractAddress = await game.getAddress();
    console.log("✅ HashplayGame deployed to:", contractAddress);

    // Save ABI and address for the frontend
    const artifact = {
        address: contractAddress,
        abi: JSON.parse(fs.readFileSync(
            path.join(__dirname, "../artifacts/contracts/HashplayGame.sol/HashplayGame.json")
        ).toString()).abi
    };

    const outPath = path.join(__dirname, "../../src/contracts/HashplayGame.json");
    fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
    console.log("✅ ABI saved to src/contracts/HashplayGame.json");
    console.log("⚠️  Update VITE_MINING_ENGINE_ADDRESS in .env to:", contractAddress);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
