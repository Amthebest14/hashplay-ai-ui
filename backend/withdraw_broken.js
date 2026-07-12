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
    console.log("Broken contract balance:", ethers.formatEther(bal));
    
    if (bal > 0n) {
        console.log("Withdrawing HBAR...");
        const tx = await play.withdrawHBAR(bal);
        await tx.wait();
        console.log("Successfully withdrew HBAR.");
    }
}

main().catch(console.error);
