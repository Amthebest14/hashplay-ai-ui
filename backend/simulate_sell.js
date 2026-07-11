const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const playAddress = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
    const abi = [
        "function sell(uint256 playAmount) external",
        "function currentPrice() public view returns (uint256)",
        "function balanceOf(address) public view returns (uint256)"
    ];
    
    // Check if the user really sent it and what the error was
    const wallet = new ethers.Wallet("0x" + process.env.HEDERA_OPERATOR_KEY, provider);
    const contract = new ethers.Contract(playAddress, abi, wallet);
    
    const playAmount = ethers.parseUnits("0.0001", 8); // Just sell a tiny bit
    
    try {
        const tx = await contract.sell(playAmount);
        console.log("Success?", tx.hash);
    } catch (e) {
        console.log("Error:", e.reason || e.shortMessage || e.message);
    }
}

main().catch(console.error);
