const { ethers } = require("ethers");
const fs = require('fs');
require("dotenv").config({ path: "../.env" });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet("0x" + process.env.HEDERA_OPERATOR_KEY, provider);
    
    const brokenContract = "0x6E165d21dd0B57da3F75CC56C97F9d3C82e42c81";
    const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/PlayToken.sol/PlayToken.json', 'utf8'));
    const play = new ethers.Contract(brokenContract, artifact.abi, wallet);
    
    const bal = await provider.getBalance(brokenContract);
    console.log("Broken contract balance (Wei):", bal.toString());
    
    // Convert Wei to Tinybars (divide by 10^10)
    const tinybars = bal / 10000000000n;
    console.log("Withdrawing", tinybars.toString(), "tinybars...");
    
    try {
        const tx = await play.withdrawHBAR(tinybars);
        await tx.wait();
        console.log("Successfully withdrew HBAR.");
    } catch (e) {
        console.error("Failed to withdraw tinybars", e);
    }
}

main().catch(console.error);
