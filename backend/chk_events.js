const { ethers } = require('ethers');
async function main() {
    const p = new ethers.JsonRpcProvider('https://mainnet.hashio.io/api');
    const c = new ethers.Contract('0x204D71684c5F33ACbEc3182EE07B875910a0E1c8', ['event Airdropped(address indexed player, uint256 playAmount, uint256 xpSnapshot)'], p);
    
    // Hashio doesn't allow 'earliest' to 'latest' if > 7 days, but this contract was deployed TODAY, so it's fine.
    // Actually, to be safe from Hashio limits, we fetch the last 10000 blocks.
    const latest = await p.getBlockNumber();
    const fromBlock = Math.max(0, latest - 10000);
    
    const logs = await p.getLogs({
        address: '0x204D71684c5F33ACbEc3182EE07B875910a0E1c8',
        fromBlock: fromBlock,
        toBlock: 'latest',
        topics: [c.interface.getEvent('Airdropped').topicHash]
    });
    
    console.log('Total Airdropped Events:', logs.length);
    let sum = 0n;
    logs.forEach(l => {
        const parsed = c.interface.parseLog(l);
        sum += parsed.args.playAmount;
    });
    console.log('Total Airdropped Amount:', ethers.formatUnits(sum, 8));
}
main().catch(console.error);
