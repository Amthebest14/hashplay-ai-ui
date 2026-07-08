require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

const CORRECT_DESTINATION = "0x000000000000000000000000000000000072F6FE"; // 0.0.7534334

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
  const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
  const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

  const abi = ["function withdrawHBAR(uint256 amount) external"];
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  // Step 1: Get contract balance
  const contractBal = await provider.getBalance(contractAddress);
  console.log(`Contract balance: ${ethers.formatEther(contractBal)} HBAR`);

  if (contractBal === 0n) {
    console.log("Contract is empty.");
    return;
  }

  // Withdraw all (in tinybars — 8 decimals for Hedera contract)
  const tinybars = contractBal / 10000000000n; // convert wei to tinybars
  console.log(`Step 1: Withdrawing ${ethers.formatEther(contractBal)} HBAR from contract to owner wallet...`);

  const tx1 = await contract.withdrawHBAR(tinybars, { gasLimit: 200000 });
  await tx1.wait();
  console.log(`✅ Withdrawn. Tx: ${tx1.hash}`);

  // Small delay then immediately forward
  await new Promise(r => setTimeout(r, 2000));

  // Step 2: Forward everything from owner wallet to correct destination
  const ownerBal = await provider.getBalance(wallet.address);
  console.log(`\nOwner wallet balance: ${ethers.formatEther(ownerBal)} HBAR`);

  const feeData = await provider.getFeeData();
  const GAS_LIMIT = 21000n;
  const gasCost = GAS_LIMIT * feeData.maxFeePerGas;
  const sendAmount = ownerBal - gasCost - ethers.parseEther("0.1"); // keep 0.1 HBAR buffer

  if (sendAmount <= 0n) {
    console.log("Not enough to forward after gas.");
    return;
  }

  console.log(`Step 2: Forwarding ${ethers.formatEther(sendAmount)} HBAR to 0.0.7534334...`);
  const tx2 = await wallet.sendTransaction({
    to: CORRECT_DESTINATION,
    value: sendAmount,
    gasLimit: GAS_LIMIT,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  });
  await tx2.wait();
  console.log(`✅ Forwarded! Tx: ${tx2.hash}`);
  console.log(`\nDone. ${ethers.formatEther(sendAmount)} HBAR is now in your wallet (0.0.7534334).`);
}

main().catch(console.error);
