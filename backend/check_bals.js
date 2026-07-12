const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet("0x" + process.env.HEDERA_OPERATOR_KEY, provider);
    const bal = await provider.getBalance(wallet.address);
    console.log("Operator Balance:", ethers.formatEther(bal));
    
    const brokenContract = "0x6E165d21dd0B57da3F75CC56C97F9d3C82e42c81";
    const cBal = await provider.getBalance(brokenContract);
    console.log("Broken Contract Balance:", ethers.formatEther(cBal));
}

main().catch(console.error);
