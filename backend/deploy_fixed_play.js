const { ethers } = require("ethers");
const fs = require('fs');
require("dotenv").config({ path: "../.env" });

async function main() {
    console.log("Starting Contract Fix...");
    
    // Connect to the provider
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    
    // Check if operator has enough HBAR, otherwise ask user to provide one
    // Let the user know they need to put their own private key here if they want to deploy it
    const deployKey = process.env.HEDERA_OPERATOR_KEY;
    const wallet = new ethers.Wallet(deployKey, provider);
    
    const bal = await provider.getBalance(wallet.address);
    console.log("Deployer balance:", ethers.formatEther(bal), "HBAR");
    
    if (bal < ethers.parseEther("3.0")) {
        console.error("\n[!] WARNING: Deployer balance is less than 3 HBAR. Deployment might fail due to insufficient funds.");
        console.error("Please fund your HEDERA_OPERATOR_KEY account or replace it in .env with a funded private key.");
    }

    console.log("\nDeploying new PlayToken...");
    const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/PlayToken.sol/PlayToken.json', 'utf8'));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    const newPlay = await factory.deploy();
    await newPlay.waitForDeployment();
    const newAddress = await newPlay.getAddress();
    console.log("✅ New PlayToken deployed at:", newAddress);
    
    // 3. Restore user balance
    const operatorAddress = "0xDF79007ee031CA08b1dD8A7Ed8918286BF657847"; // The user's wallet
    const playAmount = "3113308026426"; // 31,133.08 PLAY
    console.log(`\nRestoring ${playAmount} PLAY to ${operatorAddress}...`);
    const txAirdrop = await newPlay.airdrop(operatorAddress, playAmount, 0);
    await txAirdrop.wait();
    console.log("✅ Balance restored.");
    
    // 4. Update UI files
    console.log("\nUpdating SectionToken.tsx with new address...");
    let uiFile = fs.readFileSync('../src/components/SectionToken.tsx', 'utf8');
    uiFile = uiFile.replace(/const PLAY_TOKEN_ADDRESS = "0x[a-fA-F0-9]+";/, `const PLAY_TOKEN_ADDRESS = "${newAddress}";`);
    fs.writeFileSync('../src/components/SectionToken.tsx', uiFile);
    
    console.log("\n✅ Fix Complete! You can now run `npm run dev` and test the swap.");
}

main().catch(console.error);
