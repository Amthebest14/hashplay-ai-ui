const { ethers } = require("ethers");
const fs = require('fs');
require("dotenv").config({ path: "../.env" });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
    
    const brokenContract = "0x6E165d21dd0B57da3F75CC56C97F9d3C82e42c81";
    const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/PlayToken.sol/PlayToken.json', 'utf8'));
    const play = new ethers.Contract(brokenContract, artifact.abi, wallet);
    
    console.log("Withdrawing 19 HBAR from broken contract...");
    const tinybars = 1900000000n; // 19 * 10^8
    const tx = await play.withdrawHBAR(tinybars, { gasLimit: 100_000 });
    await tx.wait();
    console.log("Successfully withdrew 19 HBAR.");
}

main().catch(console.error);
