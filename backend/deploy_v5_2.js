const { ethers, getAddress } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);

    console.log("Deploying HashplayArenaV5 (V5.2 Debug) to Mainnet...");
    
    const contractPath = path.join(__dirname, 'artifacts/contracts/HashplayArenaV5.sol/HashplayArenaV5.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    
    const factory = new ethers.ContractFactory(contractJson.abi, contractJson.bytecode, wallet);
    
    // Treasury: 0.0.10418925
    const treasuryAddress = getAddress("0xdf79007ee031ca08b1dd8a7ed8918286bf657847");
    
    const contract = await factory.deploy(treasuryAddress, {
        gasLimit: 3000000
    });
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log(`\n✅ V5.2 Debug Deployed: ${address}`);
    console.log("Update .env with this address and Vercel will follow.");
}

main().catch(console.error);
