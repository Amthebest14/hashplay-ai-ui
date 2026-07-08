require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

const NEW_OWNER = "0x0000000000000000000000000000000000A22AF6"; // 0.0.10627830

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
  const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
  const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

  const abi = [
    "function transferOwnership(address newOwner) external",
    "function setTreasuryWallet(address _newTreasury) external",
    "function owner() view returns (address)",
    "function treasuryWallet() view returns (address)"
  ];
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  // Verify current state
  const currentOwner = await contract.owner();
  const currentTreasury = await contract.treasuryWallet();
  console.log(`Current owner:    ${currentOwner}`);
  console.log(`Current treasury: ${currentTreasury}`);
  console.log(`New owner:        ${NEW_OWNER}\n`);

  // Step 1: Transfer ownership
  console.log("Step 1: Transferring ownership...");
  const tx1 = await contract.transferOwnership(NEW_OWNER, { gasLimit: 100000 });
  await tx1.wait();
  console.log(`✅ Ownership transferred! Tx: ${tx1.hash}`);

  // Step 2: Update treasury wallet
  console.log("Step 2: Updating treasury wallet...");
  const tx2 = await contract.setTreasuryWallet(NEW_OWNER, { gasLimit: 100000 });
  await tx2.wait();
  console.log(`✅ Treasury updated! Tx: ${tx2.hash}`);

  // Verify
  const newOwner = await contract.owner();
  const newTreasury = await contract.treasuryWallet();
  console.log(`\n--- VERIFIED ---`);
  console.log(`New owner:    ${newOwner}`);
  console.log(`New treasury: ${newTreasury}`);
  console.log(`\nContract is now fully secured under 0.0.10627830 ✅`);
}

main().catch(console.error);
