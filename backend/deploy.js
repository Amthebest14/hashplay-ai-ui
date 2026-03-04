require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
    const hashplayTokenId = process.env.VITE_HASHPLAY_TOKEN_ID;
    const treasuryAccountId = process.env.VITE_TREASURY_ACCOUNT_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;

    if (!hashplayTokenId || !treasuryAccountId || !operatorKey) {
        throw new Error("Missing required environment variables.");
    }

    // Convert Hedera Account/Token IDs to EVM Addresses
    const tokenEvmAddress = "0x00000000000000000000000000000000" + parseInt(hashplayTokenId.split('.')[2]).toString(16).padStart(8, '0');
    const treasuryEvmAddress = "0x00000000000000000000000000000000" + parseInt(treasuryAccountId.split('.')[2]).toString(16).padStart(8, '0');

    console.log(`Using Token EVM Address: ${tokenEvmAddress}`);
    console.log(`Using Treasury EVM Address: ${treasuryEvmAddress}`);

    // Set up Ethers Provider for Hedera Testnet Hashio JSON-RPC
    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    // Load compiled contract
    const contractJsonPath = path.resolve(__dirname, 'HashplayMiningEngine.json');
    const { abi, bytecode } = JSON.parse(fs.readFileSync(contractJsonPath, 'utf8'));

    // Deploy contract
    console.log("Deploying contract...");
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    // Deploy with constructor arguments
    const contract = await factory.deploy(tokenEvmAddress, treasuryEvmAddress);

    console.log(`Waiting for deployment transaction ${contract.deploymentTransaction().hash}...`);
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log(`\n✅ HashplayMiningEngine deployed to: ${deployedAddress}`);

    // Save the ABI and Address for the frontend to use
    const frontendOutput = {
        address: deployedAddress,
        abi: abi
    };

    const frontendPath = path.resolve(__dirname, '..', 'src', 'contracts', 'HashplayMiningEngine.json');
    fs.mkdirSync(path.dirname(frontendPath), { recursive: true });
    fs.writeFileSync(frontendPath, JSON.stringify(frontendOutput, null, 2));

    console.log(`Frontend artifact saved to ${frontendPath}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
