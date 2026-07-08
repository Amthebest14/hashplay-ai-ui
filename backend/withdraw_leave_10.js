require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
  const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
  const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

  const abi = ["function withdrawHBAR(uint256 amount) external"];
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  // Get current contract balance via JSON RPC (returns 18 decimals)
  const contractBalWei = await provider.getBalance(contractAddress);
  const contractBalHbar = Number(ethers.formatEther(contractBalWei));
  console.log(`Current contract balance: ${contractBalHbar} HBAR`);

  if (contractBalHbar <= 10) {
    console.log("Contract balance is already <= 10 HBAR. Nothing to withdraw.");
    return;
  }

  // We want to leave 10 HBAR. 
  // Amount to withdraw in HBAR:
  const withdrawHbar = contractBalHbar - 10;
  
  // The smart contract expects amounts in tinybars (8 decimals).
  // 1 HBAR = 100,000,000 tinybars
  const tinybarsToWithdraw = BigInt(Math.floor(withdrawHbar * 100000000));

  console.log(`Withdrawing ${withdrawHbar} HBAR (${tinybarsToWithdraw} tinybars) to leave exactly 10 HBAR...`);
  
  const tx = await contract.withdrawHBAR(tinybarsToWithdraw, { gasLimit: 200000 });
  const receipt = await tx.wait();
  console.log(`✅ Done! Tx: ${receipt.hash}`);

  // Verify balance after
  const newBalWei = await provider.getBalance(contractAddress);
  console.log(`New Contract balance: ${ethers.formatEther(newBalWei)} HBAR`);
}

main().catch(console.error);
