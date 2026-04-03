require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
  const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);

  const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

  // Step 1: Check balance (returns weibars, 10^18 base)
  const balanceWeibars = await provider.getBalance(contractAddress);
  // Convert weibars to tinybars: 1 HBAR = 10^18 weibars = 10^8 tinybars
  // So tinybars = weibars / 10^10
  const balanceTinybars = balanceWeibars / 10000000000n;
  const balanceHbar = Number(balanceTinybars) / 1e8;

  console.log(`Contract: ${contractAddress}`);
  console.log(`Balance:  ${balanceHbar} HBAR (${balanceTinybars.toString()} tinybars)`);

  if (balanceTinybars === 0n) {
    console.log("Contract is already empty. Nothing to withdraw.");
    return;
  }

  // Step 2: Withdraw ALL (contract expects tinybars)
  const abi = ["function withdrawHBAR(uint256 amount) external"];
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  console.log(`\nWithdrawing ALL ${balanceHbar} HBAR (${balanceTinybars} tinybars)...`);
  try {
    const tx = await contract.withdrawHBAR(balanceTinybars, { gasLimit: 200000 });
    const receipt = await tx.wait();
    console.log(`✅ SUCCESS! All HBAR withdrawn.`);
    console.log(`   Tx Hash: ${receipt.hash}`);

    // Verify
    const newBalanceWeibars = await provider.getBalance(contractAddress);
    const newBalanceTinybars = newBalanceWeibars / 10000000000n;
    console.log(`   Remaining balance: ${Number(newBalanceTinybars) / 1e8} HBAR`);
  } catch (err) {
    console.error("❌ Withdrawal FAILED:", err.message);
  }
}

main();
