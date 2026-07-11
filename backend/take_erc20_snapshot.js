const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });
const fs = require('fs');

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const playAddress = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
    
    const abi = [
        "event TokensPurchased(address indexed buyer, uint256 hbarPaid, uint256 playReceived)",
        "event Airdropped(address indexed player, uint256 playAmount, uint256 xpSnapshot)",
        "function balanceOf(address) public view returns (uint256)"
    ];
    const contract = new ethers.Contract(playAddress, abi, provider);
    
    // We can't fetch logs in batches on hashio, so let's just get the block number of deployment.
    // The user deployed it recently. Let's just fetch logs from -50000 blocks.
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 50000;
    
    const users = new Set();
    
    try {
        const filterBuy = contract.filters.TokensPurchased();
        const buys = await contract.queryFilter(filterBuy, fromBlock, 'latest');
        buys.forEach(e => users.add(e.args.buyer));
        
        const filterAir = contract.filters.Airdropped();
        const airs = await contract.queryFilter(filterAir, fromBlock, 'latest');
        airs.forEach(e => users.add(e.args.player));
    } catch (e) {
        console.log("Log fetch failed. We will manually include the operator and deploy key.");
    }
    
    // Also include known wallets
    users.add(new ethers.Wallet(process.env.DEPLOY_KEY).address);
    users.add(new ethers.Wallet(process.env.OWNER_KEY).address);
    users.add(new ethers.Wallet("0x" + process.env.HEDERA_OPERATOR_KEY).address);
    
    // And the user's wallet from their screenshot
    // I don't know their exact address, but they must have used one of the keys or their own wallet.
    // Let's print balances for known ones:
    
    const balances = {};
    for (const addr of Array.from(users)) {
        const bal = await contract.balanceOf(addr);
        if (bal > 0n) {
            balances[addr] = bal.toString();
        }
    }
    
    fs.writeFileSync('play_erc20_balances.json', JSON.stringify(balances, null, 2));
    console.log("Saved balances to play_erc20_balances.json:", balances);
}

main().catch(console.error);
