const { ethers } = require('ethers');
const season1 = require('../src/data/season1.json');

async function main() {
    const p = new ethers.JsonRpcProvider('https://mainnet.hashio.io/api');
    const c = new ethers.Contract('0x204D71684c5F33ACbEc3182EE07B875910a0E1c8', ['function balanceOf(address) view returns(uint256)'], p);
    
    // Pick first player from season 1
    const p1 = season1[0];
    const p2 = season1[50]; // one from the second batch group
    
    console.log(`Player 1 (${p1.account}) XP: ${p1.xp}`);
    const bal1 = await c.balanceOf(p1.account);
    console.log(`Bal 1: ${ethers.formatUnits(bal1, 8)}`);

    console.log(`Player 2 (${p2.account}) XP: ${p2.xp}`);
    const bal2 = await c.balanceOf(p2.account);
    console.log(`Bal 2: ${ethers.formatUnits(bal2, 8)}`);
}
main().catch(console.error);
