require('dotenv').config({ path: './.env' });
const { ethers } = require('ethers');

async function main() {
    const provider = new ethers.JsonRpcProvider('https://mainnet.hashio.io/api');
    const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
    const contractAddress = "0x5E238Df850C258A199AFea2C1C64Bf4264f8C3Fa";
    const abi = [
        'function play(uint8 gameType, uint8 prediction) external payable',
        'event GameResult(address indexed player, uint8 gameType, uint8 prediction, uint256 wager, bool won, uint256 hbarPayout, uint256 xpEarned, uint256 rollResult)'
    ];
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    console.log(`\nTesting V5 Fixed Play at ${contractAddress}...`);
    try {
        const tx = await contract.play(2, 1, { 
            value: ethers.parseEther('1'), 
            gasLimit: '0x2DC6C0' // Force hex 3M
        });
        console.log(`Submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`SUCCESS! Gas: ${receipt.gasUsed.toString()}`);
    } catch (e) {
        console.error('FAILED:', e.message);
    }
}
main();
