const { ethers } = require("ethers");
const fs = require('fs');
const { execSync } = require('child_process');
require("dotenv").config({ path: "../.env" });

async function main() {
    console.log("Starting Contract Fix...");
    
    // 1. Compile the newly modified PlayToken.sol
    console.log("Compiling new PlayToken...");
    execSync("npx hardhat compile", { stdio: 'inherit' });
    
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const operatorWallet = new ethers.Wallet("0x" + process.env.HEDERA_OPERATOR_KEY, provider);
    
    // 2. Deploy new contract
    console.log("Deploying new PlayToken...");
    const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/PlayToken.sol/PlayToken.json', 'utf8'));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, operatorWallet);
    const newPlay = await factory.deploy();
    await newPlay.waitForDeployment();
    const newAddress = await newPlay.getAddress();
    console.log("New PlayToken deployed at:", newAddress);
    
    // 3. Restore user balance
    const operatorAddress = "0xDF79007ee031CA08b1dD8A7Ed8918286BF657847";
    const playAmount = "3113308026426";
    console.log(`Restoring ${playAmount} PLAY to ${operatorAddress}...`);
    const txAirdrop = await newPlay.airdrop(operatorAddress, playAmount, 0);
    await txAirdrop.wait();
    console.log("Balance restored.");
    
    // 4. Seed new contract with 0.5 HBAR for testing
    console.log("Seeding new contract with 0.5 HBAR...");
    const txSeed = await operatorWallet.sendTransaction({
        to: newAddress,
        value: ethers.parseEther("0.5")
    });
    await txSeed.wait();
    console.log("New contract seeded.");
    
    // 5. Update UI files
    console.log("Updating SectionToken.tsx with new address...");
    let uiFile = fs.readFileSync('../src/components/SectionToken.tsx', 'utf8');
    uiFile = uiFile.replace(/const PLAY_TOKEN_ADDRESS = "0x[a-fA-F0-9]+";/, `const PLAY_TOKEN_ADDRESS = "${newAddress}";`);
    fs.writeFileSync('../src/components/SectionToken.tsx', uiFile);
    
    console.log("Fix Complete!");
}

main().catch(console.error);
