const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const cBal = await provider.getBalance("0x0000000000000000000000000000000000A22AF6"); // Treasury
    console.log("Treasury Balance:", ethers.formatEther(cBal));
}

main().catch(console.error);
