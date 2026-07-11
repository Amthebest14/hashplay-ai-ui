const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const playAddress = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
    
    const abi = [
        "function bondingSupply() public view returns (uint256)",
        "function currentPrice() public view returns (uint256)"
    ];
    const contract = new ethers.Contract(playAddress, abi, provider);
    const supply = await contract.bondingSupply();
    const price = await contract.currentPrice();
    console.log("Bonding Supply:", supply.toString());
    console.log("Current Price (wei):", price.toString());
    
    // Simulate sell
    try {
        const playAmount = ethers.parseUnits("31133.08", 8);
        const hbarGross = (BigInt(playAmount) * BigInt(price)) / BigInt(1e8);
        const hbarPayout = (hbarGross * 95n) / 100n;
        console.log("Calculated Hbar Payout (wei):", hbarPayout.toString());
        
        // Static call to simulate exactly what fails
        const wallet = new ethers.Wallet(process.env.OWNER_KEY, provider);
        const contractWithSigner = contract.connect(wallet);
        // We can't actually static call if we don't have the balance, but let's see.
    } catch (e) {
        console.error(e);
    }
}

main().catch(console.error);
