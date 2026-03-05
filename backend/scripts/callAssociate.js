require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const contractAddress = "0x3dFbaE03D03461683b4A5173C45D7CC8Cb5754dC";

    if (!operatorKey || !contractAddress) {
        throw new Error("Missing env vars.");
    }

    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    const contractJsonPath = path.resolve(__dirname, '..', 'HashplayGame.json');
    const { abi } = JSON.parse(fs.readFileSync(contractJsonPath, 'utf8'));

    const contract = new ethers.Contract(contractAddress, abi, wallet);

    console.log(`Calling selfAssociate on ${contractAddress}...`);
    try {
        const tx = await contract.selfAssociate({ gasLimit: 800000 });
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Contract successfully associated with $HASHPLAY token.`);
    } catch (e) {
        console.error("❌ Association failed:", e.message);
    }
}

main().catch(console.error);
