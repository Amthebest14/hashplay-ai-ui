const { ethers } = require('ethers');
async function main() {
    const p = new ethers.JsonRpcProvider('https://mainnet.hashio.io/api');
    const c = new ethers.Contract('0x204D71684c5F33ACbEc3182EE07B875910a0E1c8', ['event Airdropped(uint256,uint256)'], p);
    const logs = await c.queryFilter('Airdropped', 0, 'latest');
    logs.forEach(l => console.log('Airdrop:', ethers.formatUnits(l.args[0], 8), 'to', l.args[1].toString(), 'players'));
}
main();
