require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

async function main() {
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

    if (!operatorKey || !contractAddress) {
        throw new Error("Missing environment variables.");
    }

    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    const abi = [
        "function withdrawHBAR(uint256 amount) external",
        "function userPoints(address) external view returns (uint256)",
        "function fundBankroll() external payable",
        "function owner() external view returns (address)"
    ];

    const contract = new ethers.Contract(contractAddress, abi, wallet);

    console.log(`--- MAINNET VERIFICATION: ${contractAddress} ---`);
    console.log(`Contract Owner: ${await contract.owner()}`);
    console.log(`Wallet Address: ${wallet.address}`);
    
    // Check initial balance
    let balBefore = await provider.getBalance(contractAddress);
    console.log(`Initial Contract Balance: ${ethers.formatEther(balBefore)} HBAR`);

    // 1. Fund Bankroll (Send 5 HBAR)
    console.log("\n1. Testing Mainnet Bankroll Funding (5 HBAR)...");
    const fundAmount = ethers.parseEther("5"); 
    const fundTx = await contract.fundBankroll({ value: fundAmount, gasLimit: 200000 });
    await fundTx.wait();
    console.log("✅ Successfully funded 5 HBAR to Mainnet contract.");

    // 2. Check Balance
    let balAfterFund = await provider.getBalance(contractAddress);
    console.log(`Post-Funding Balance: ${ethers.formatEther(balAfterFund)} HBAR`);

    // 3. Test Withdrawal (The "Escape Hatch")
    // Note: The contract expects 'amount' in tinybars (8 decimals)
    console.log("\n2. Testing Withdrawal (Recovery) of 5 HBAR...");
    const tinybarAmount = ethers.parseUnits("5", 8); 
    const withdrawTx = await contract.withdrawHBAR(tinybarAmount, { gasLimit: 200000 });
    await withdrawTx.wait();
    console.log(`✅ Successfully withdrew 5 HBAR back to owner on Mainnet.`);

    let balFinal = await provider.getBalance(contractAddress);
    console.log(`Final Contract Balance: ${ethers.formatEther(balFinal)} HBAR`);

    console.log("\n--- MAINNET VERIFICATION COMPLETE: ALL SYSTEMS SAFE ---");
}

main().catch(console.error);
