require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
  const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);

  const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;
  const abi = ["function fundBankroll() external payable"];
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  // 5 HBAR = 5 * 10^18 weibars (Hedera EVM uses 18-decimal weibars via JSON-RPC)
  const amount = ethers.parseEther("5");

  console.log(`Funding ${contractAddress} with 5 HBAR...`);
  const tx = await contract.fundBankroll({ value: amount, gasLimit: 100000 });
  await tx.wait();
  console.log(`✅ Funded! Tx: ${tx.hash}`);

  const balance = await provider.getBalance(contractAddress);
  console.log(`Contract balance: ${ethers.formatEther(balance)} HBAR`);
}

main().catch(console.error);
