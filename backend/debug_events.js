const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const playAddress = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
    
    const abi = [
        "event TokensPurchased(address indexed buyer, uint256 hbarPaid, uint256 playReceived)"
    ];
    const contract = new ethers.Contract(playAddress, abi, provider);
    
    // Get past events
    const filter = contract.filters.TokensPurchased();
    const events = await contract.queryFilter(filter, -1000);
    console.log(`Found ${events.length} purchase events.`);
    for (const e of events) {
        console.log(`Buyer: ${e.args.buyer}, HBAR Paid (wei): ${e.args.hbarPaid.toString()}, PLAY Received: ${e.args.playReceived.toString()}`);
    }
}

main().catch(console.error);
