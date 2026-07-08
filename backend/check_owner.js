require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
  const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
  const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

  const abi = ["function owner() view returns (address)"];
  const contract = new ethers.Contract(contractAddress, abi, provider);

  const owner = await contract.owner();
  console.log(`Contract owner: ${owner}`);
  console.log(`Caller wallet: ${wallet.address}`);
  
  if (owner.toLowerCase() === wallet.address.toLowerCase()) {
      console.log("Wallet is the owner.");
  } else {
      console.log("Wallet is NOT the owner!");
  }
}

main().catch(console.error);
