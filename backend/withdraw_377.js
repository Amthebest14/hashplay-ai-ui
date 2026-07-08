require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
  const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
  const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

  const abi = ["function withdrawHBAR(uint256 amount) external"];
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  // 377 HBAR = 377 * 10^8 tinybars
  const amount = 377n * 100000000n;

  console.log(`Withdrawing 377 HBAR from ${contractAddress} to treasury...`);
  const tx = await contract.withdrawHBAR(amount, { gasLimit: 200000 });
  const receipt = await tx.wait();
  console.log(`✅ Done! Tx: ${receipt.hash}`);

  // Verify balances
  const contractBal = await provider.getBalance(contractAddress);
  console.log(`Contract balance: ${ethers.formatEther(contractBal)} HBAR`);
}

main().catch(console.error);
