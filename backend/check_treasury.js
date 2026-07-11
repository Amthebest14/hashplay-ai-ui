const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

const ARENA_ADDRESS = "0x0000000000000000000000000000000000a2306e";

const ARENA_ABI = [
    "function treasuryWallet() view returns (address)",
    "function owner() view returns (address)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const arena = new ethers.Contract(ARENA_ADDRESS, ARENA_ABI, provider);

    const treasury = await arena.treasuryWallet();
    const owner = await arena.owner();
    console.log("Arena Owner:   ", owner);
    console.log("Treasury Wallet:", treasury);
}

main().catch(console.error);
