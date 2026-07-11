const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

const ARENA_ADDRESS = "0x0000000000000000000000000000000000a2306e";
const NEW_TREASURY_EVM = "0x0000000000000000000000000000000000a2a956"; // 0.0.10627830

const ARENA_ABI = [
    "function setTreasuryWallet(address _newTreasury) external",
    "function treasuryWallet() view returns (address)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(process.env.OWNER_KEY, provider);

    console.log("Operator:", wallet.address);

    const arena = new ethers.Contract(ARENA_ADDRESS, ARENA_ABI, wallet);

    const current = await arena.treasuryWallet();
    console.log("Current treasury:", current);

    console.log("Setting new treasury to:", NEW_TREASURY_EVM);
    const tx = await arena.setTreasuryWallet(NEW_TREASURY_EVM, {
        gasLimit: 100000,
        gasPrice: ethers.parseUnits("600", "gwei")
    });
    console.log("TX hash:", tx.hash);
    await tx.wait();

    const updated = await arena.treasuryWallet();
    console.log("✅ Treasury updated to:", updated);
}

main().catch(console.error);
