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

    // Convert Hedera Account ID (0.0.x) to EVM Address
    const treasuryEvmAddress = "0x00000000000000000000000000000000" + parseInt(treasuryAccountId.split('.')[2]).toString(16).padStart(8, '0');

    console.log(`--- DEPLOYING HashplayArenaV4 TO HEDERA ${network.toUpperCase()} ---`);
    console.log(`Treasury Wallet Address for Fees: ${treasuryEvmAddress}`);

    // Set up Ethers Provider based on network
    const rpcUrl = network === "mainnet" ? "https://mainnet.hashio.io/api" : "https://testnet.hashio.io/api";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    // Load compiled contract from artifacts
    const artifactPath = path.resolve(__dirname, 'artifacts', 'contracts', 'HashplayArenaV4.sol', 'HashplayArenaV4.json');
    const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    // Deploy contract
    console.log("Rolling out HashplayArenaV4 (30% win rate)...");
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    const contract = await factory.deploy(treasuryEvmAddress, { gasLimit: 1500000, gasPrice: ethers.parseUnits('1050', 'gwei') });

    console.log(`Waiting for deployment transaction ${contract.deploymentTransaction().hash}...`);
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log(`\n✅ HashplayArenaV4 deployed to ${network}: ${deployedAddress}`);

    // Save the ABI and Address for the frontend
    const frontendOutput = {
        address: deployedAddress,
        abi: abi
    };

    // We save this as HashplayMiningEngine.json because the frontend is built to import that file specifically.
    const frontendPath = path.resolve(__dirname, '..', 'src', 'contracts', 'HashplayMiningEngine.json');
    fs.mkdirSync(path.dirname(frontendPath), { recursive: true });
    fs.writeFileSync(frontendPath, JSON.stringify(frontendOutput, null, 2));

    console.log(`Frontend artifact saved to ${frontendPath}`);
}

main().catch(console.error);
