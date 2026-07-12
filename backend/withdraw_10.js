const { ethers } = require("ethers");
const fs = require('fs');
require("dotenv").config({ path: "../.env" });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
    
    const brokenContract = "0x165C38e572B6B8b0c2A29e4150a57072bD31e37D";
    const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/PlayToken.sol/PlayToken.json', 'utf8'));
    const play = new ethers.Contract(brokenContract, artifact.abi, wallet);
    
    console.log("Withdrawing 10 HBAR from broken contract...");
    const tinybars = 1000000000n; // 10 * 10^8
    const tx = await play.withdrawHBAR(tinybars, { gasLimit: 100_000 });
    await tx.wait();
    console.log("Successfully withdrew 10 HBAR.");
}

main().catch(console.error);
