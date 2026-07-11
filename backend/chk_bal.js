const { ethers } = require('ethers');
async function main() {
    const p = new ethers.JsonRpcProvider('https://mainnet.hashio.io/api');
    const c = new ethers.Contract('0x204D71684c5F33ACbEc3182EE07B875910a0E1c8', ['function balanceOf(address) view returns(uint256)'], p);
    console.log('Bal:', ethers.formatUnits(await c.balanceOf('0x4F05f15E285628b0305719973E73562479fF3746'), 8));
}
main();
