require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

async function main() {
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const contractAddress = "0xe31E86961149024fe3d8f96c58D7F20d0a2dEdBa";
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    console.log(`Funding V5.1 Fallback (${contractAddress}) with 5 HBAR...`);
    const tx = await wallet.sendTransaction({
        to: contractAddress,
        value: ethers.parseUnits("5", 18),
        gasLimit: 100000
    });
    console.log(`Submitted: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Funded!");
}

main().catch(console.error);
