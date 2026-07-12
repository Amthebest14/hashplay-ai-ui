const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });
const fs = require('fs');

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const newPlay = "0x6E165d21dd0B57da3F75CC56C97F9d3C82e42c81";
    const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/PlayToken.sol/PlayToken.json', 'utf8'));
    const contract = new ethers.Contract(newPlay, artifact.abi, provider);

    const price = await contract.currentPrice();
    console.log("Current price from contract:", price.toString());
    console.log("Formatted as 18 decimals:", ethers.formatEther(price));
    console.log("Formatted as 8 decimals:", ethers.formatUnits(price, 8));
    
    const bal = await provider.getBalance(newPlay);
    console.log("Contract balance (ethers):", bal.toString());
    console.log("Contract balance formatted:", ethers.formatEther(bal));
}

main().catch(console.error);
