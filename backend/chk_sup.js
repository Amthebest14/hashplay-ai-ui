const { ethers } = require('ethers');
const ABI = ['function totalSupply() external view returns (uint256)'];
async function main() {
    const p = new ethers.JsonRpcProvider('https://mainnet.hashio.io/api');
    const c = new ethers.Contract('0x204D71684c5F33ACbEc3182EE07B875910a0E1c8', ABI, p);
    const s = await c.totalSupply();
    console.log('Supply:', ethers.formatUnits(s, 8));
}
main();
