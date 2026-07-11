const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const dWallet = new ethers.Wallet(process.env.DEPLOY_KEY, provider);
    const hWallet = new ethers.Wallet("0x" + process.env.HEDERA_OPERATOR_KEY, provider);
    const dBal = await provider.getBalance(dWallet.address);
    const hBal = await provider.getBalance(hWallet.address);
    console.log("DEPLOY_KEY Balance:", ethers.formatEther(dBal), "HBAR");
    console.log("HEDERA_OPERATOR_KEY Balance:", ethers.formatEther(hBal), "HBAR");
}

main().catch(console.error);
