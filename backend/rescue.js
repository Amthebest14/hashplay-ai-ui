const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function main() {
    console.log("Starting Rescue...");
    
    // You MUST temporarily put your Treasury Account Private Key in the .env file as TREASURY_KEY
    const treasuryKey = process.env.TREASURY_KEY;
    if (!treasuryKey) {
        throw new Error("Please add TREASURY_KEY to your .env file!");
    }

    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(treasuryKey, provider);
    
    const OLD_PLAY = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
    const abi = ["function withdrawHBAR(uint256 amount) external"];
    const oldContract = new ethers.Contract(OLD_PLAY, abi, wallet);
    
    console.log("Withdrawing 51 HBAR (5,100,000,000 tinybars)...");
    
    // Hedera EVM uses tinybars internally for address(this).balance
    const tx = await oldContract.withdrawHBAR("5100000001"); 
    console.log("Transaction submitted, waiting for confirmation...");
    console.log("Tx Hash:", tx.hash);
    
    await tx.wait();
    console.log("✅ Successfully rescued 51 HBAR to your Treasury Wallet!");
    
    // Now transfer 5 HBAR to the operator so the AI can deploy the fix
    console.log("\nTransferring 5 HBAR to the Operator account for deployment fees...");
    const operatorAddress = "0xDF79007ee031CA08b1dD8A7Ed8918286BF657847";
    const txFund = await wallet.sendTransaction({
        to: operatorAddress,
        value: ethers.parseEther("5.0")
    });
    console.log("Transfer submitted. Tx Hash:", txFund.hash);
    await txFund.wait();
    console.log("✅ Successfully funded the Operator Account!");
}

main().catch(console.error);
