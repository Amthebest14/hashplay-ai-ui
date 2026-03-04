const hre = require("hardhat");

async function main() {
    const hashplayTokenId = process.env.VITE_HASHPLAY_TOKEN_ID;
    const treasuryAccountId = process.env.VITE_TREASURY_ACCOUNT_ID;

    if (!hashplayTokenId || !treasuryAccountId) {
        console.error("Missing VITE_HASHPLAY_TOKEN_ID or VITE_TREASURY_ACCOUNT_ID in .env!");
        process.exit(1);
    }

    // The Hedera Smart Contract service maps token IDs and Account IDs to EVM addresses
    // To interact from solidity, we usually calculate the EVM equivalent of the 0.0.X ID
    // e.g. 0.0.8076828 -> 0x00000000000000000000000000000000007B3E1C (Hex representation)
    const tokenEvmAddress = "0x00000000000000000000000000000000" + parseInt(hashplayTokenId.split('.')[2]).toString(16).padStart(8, '0');
    const treasuryEvmAddress = "0x00000000000000000000000000000000" + parseInt(treasuryAccountId.split('.')[2]).toString(16).padStart(8, '0');

    console.log(`Token EVM Address: ${tokenEvmAddress}`);
    console.log(`Treasury EVM Address: ${treasuryEvmAddress}`);

    console.log("Deploying HashplayMiningEngine...");
    const MiningEngine = await hre.ethers.getContractFactory("HashplayMiningEngine");
    const miningEngine = await MiningEngine.deploy(tokenEvmAddress, treasuryEvmAddress);

    await miningEngine.waitForDeployment();

    console.log(`HashplayMiningEngine deployed to: ${await miningEngine.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
