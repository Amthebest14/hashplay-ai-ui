require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

async function main() {
    const network = process.env.VITE_NETWORK || "testnet";
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const contractAddress = "0xB424bd941fDC76706Ed4b530f7a95d62C05678f8";

    const rpcUrl = network === "mainnet" ? "https://mainnet.hashio.io/api" : "https://testnet.hashio.io/api";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(operatorKey, provider);

    console.log(`Funding V5 Contract (${contractAddress}) with 5 HBAR...`);
    const tx = await wallet.sendTransaction({
        to: contractAddress,
        value: ethers.parseEther("5"),
        gasLimit: 100000
    });

    console.log(`Transaction submitted: ${tx.hash}`);
    await tx.wait();
    console.log("✅ V5 Contract Funded!");
}

main().catch(console.error);
