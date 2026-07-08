require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

const DESTINATION = "0x000000000000000000000000000000000072F6FE"; // 0.0.7534334

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
  const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);

  const bal = await provider.getBalance(wallet.address);
  console.log(`Old wallet balance: ${ethers.formatEther(bal)} HBAR`);

  if (bal === 0n) { console.log("Empty, nothing to send."); return; }

  const feeData = await provider.getFeeData();
  const GAS_LIMIT = 21000n;
  const gasCost = GAS_LIMIT * feeData.maxFeePerGas;
  const sendAmount = bal - gasCost;

  if (sendAmount <= 0n) { console.log("Not enough to cover gas."); return; }

  console.log(`Forwarding ${ethers.formatEther(sendAmount)} HBAR to 0.0.7534334...`);
  const tx = await wallet.sendTransaction({
    to: DESTINATION,
    value: sendAmount,
    gasLimit: GAS_LIMIT,
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  });
  await tx.wait();
  console.log(`✅ Done! Tx: ${tx.hash}`);
}

main().catch(console.error);
