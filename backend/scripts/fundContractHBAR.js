require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

async function main() {
    const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;

    if (!contractAddress || !operatorKey) {
        throw new Error("Missing required environment variables.");
    }

    console.log(`Funding Contract with HBAR: ${contractAddress}`);

    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    const amountToFund = ethers.parseEther("10"); // 10 HBAR

    console.log(`Attempting to transfer 10 HBAR...`);

    try {
        const tx = await wallet.sendTransaction({
            to: contractAddress,
            value: amountToFund,
            gasLimit: 100000
        });
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Successfully funded contract with 900 HBAR.`);
    } catch (error) {
        console.error("Transfer failed:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
