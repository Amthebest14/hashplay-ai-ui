require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
    const network = process.env.VITE_NETWORK || "testnet";
    const treasuryAccountId = process.env.VITE_TREASURY_ACCOUNT_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;

    if (!treasuryAccountId || !operatorKey) {
        throw new Error("Missing required environment variables in .env");
    }

    // Convert Hedera Account ID (0.0.x) to EVM Address shorthand
    const treasuryEvmAddress = "0x00000000000000000000000000000000" + parseInt(treasuryAccountId.split('.')[2]).toString(16).padStart(8, '0');

    console.log(`--- DEPLOYING HashplayArenaV5 TO HEDERA ${network.toUpperCase()} ---`);
    console.log(`Treasury Wallet: ${treasuryEvmAddress}`);

    const rpcUrl = network === "mainnet" ? "https://mainnet.hashio.io/api" : "https://testnet.hashio.io/api";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    const artifactPath = path.resolve(__dirname, 'artifacts', 'contracts', 'HashplayArenaV5.sol', 'HashplayArenaV5.json');
    if (!fs.existsSync(artifactPath)) {
        throw new Error("Artifact not found. Please run 'npx hardhat compile' first.");
    }
    const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    console.log("Rolling out HashplayArenaV5 (No HTS, XP System)...");
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    // Using 0x2DC6C0 (3M) gas limit for deployment
    const contract = await factory.deploy(treasuryEvmAddress, { 
        gasLimit: 3000000, 
        gasPrice: ethers.parseUnits('1200', 'gwei') 
    });

    console.log(`Waiting for deployment... Hash: ${contract.deploymentTransaction().hash}`);
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log(`\n✅ HashplayArenaV5 deployed to ${network}: ${deployedAddress}`);

    // Update frontend artifact
    const frontendOutput = {
        address: deployedAddress,
        abi: abi
    };
    const frontendPath = path.resolve(__dirname, '..', 'src', 'contracts', 'HashplayMiningEngine.json');
    fs.mkdirSync(path.dirname(frontendPath), { recursive: true });
    fs.writeFileSync(frontendPath, JSON.stringify(frontendOutput, null, 2));

    console.log(`Frontend artifact saved to ${frontendPath}`);
}

main().catch(console.error);
