require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

async function main() {
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const contractAddress = "0x5E238Df850C258A199AFea2C1C64Bf4264f8C3Fa";
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    console.log(`Funding V5 Fixed (${contractAddress}) with 5 HBAR...`);
    const tx = await wallet.sendTransaction({
        to: contractAddress,
        value: ethers.parseEther("5"),
        gasLimit: 100000
    });
    console.log(`Submitted: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Funded!");
}

main().catch(console.error);
