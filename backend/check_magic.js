const { ethers } = require("ethers");
async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const bal = await provider.getBalance("0x7398025977348Bf3023bfc609bDc92A838033C1F");
    console.log("Balance of Magic Link EVM Address:", ethers.formatEther(bal));
}
main().catch(console.error);
