require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

async function main() {
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

    if (!operatorKey || !contractAddress) {
        throw new Error("Missing environment variables.");
    }

    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    const abi = [
        "function withdrawHBAR(uint256 amount) external",
        "function userPoints(address) external view returns (uint256)",
        "function fundBankroll() external payable",
        "function owner() external view returns (address)"
    ];

    const contract = new ethers.Contract(contractAddress, abi, wallet);

    console.log(`--- STAGING VERIFICATION: ${contractAddress} ---`);
    console.log(`Contract Owner: ${await contract.owner()}`);
    console.log(`Wallet Address: ${wallet.address}`);
    
    // Check initial balance
    let balBefore = await provider.getBalance(contractAddress);
    console.log(`Initial Contract Balance: ${ethers.formatEther(balBefore)} HBAR`);

    // 1. Fund Bankroll (Send 5 HBAR)
    console.log("\n1. Testing Bankroll Funding...");
    const fundAmount = ethers.parseEther("5"); 
    const fundTx = await contract.fundBankroll({ value: fundAmount });
    await fundTx.wait();
    console.log("✅ Successfully funded 5 HBAR to contract.");

    // 2. Check Balance
    let balAfterFund = await provider.getBalance(contractAddress);
    console.log(`Post-Funding Balance: ${ethers.formatEther(balAfterFund)} HBAR`);

    // 3. Test Withdrawal (The "Escape Hatch")
    console.log("\n2. Testing Withdrawal (Recovery)...");
    const withdrawAmount = ethers.parseEther("2");
    const withdrawTx = await contract.withdrawHBAR(withdrawAmount);
    await withdrawTx.wait();
    console.log(`✅ Successfully withdrew 2 HBAR back to owner.`);

    let balFinal = await provider.getBalance(contractAddress);
    console.log(`Final Contract Balance: ${ethers.formatEther(balFinal)} HBAR`);

    console.log("\n--- VERIFICATION COMPLETE: ALL SYSTEMS NOMINAL ---");
}

main().catch(console.error);
