require('dotenv').config({ path: './.env' });
const { ethers } = require('ethers');

async function main() {
    const provider = new ethers.JsonRpcProvider('https://mainnet.hashio.io/api');
    const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
    
    // The newly deployed V5 address
    const contractAddress = "0xB424bd941fDC76706Ed4b530f7a95d62C05678f8";
    const abi = [
        'function play(uint8 gameType, uint8 prediction) external payable',
        'event GameResult(address indexed player, uint8 gameType, uint8 prediction, uint256 wager, bool won, uint256 hbarPayout, uint256 xpEarned, uint256 rollResult)',
        'event XPAwarded(address indexed player, uint256 amount)',
        'function playerXP(address) external view returns (uint256)'
    ];
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    console.log(`\nTesting V5 Play on MAINNET at ${contractAddress}...`);
    try {
        // Play Coin Flip (2), Prediction Heads (1)
        const tx = await contract.play(2, 1, { 
            value: ethers.parseEther('1'), 
            gasLimit: 3000000 
        });
        console.log('Transaction submitted:', tx.hash);
        const receipt = await tx.wait();
        console.log(`SUCCESS! Gas used: ${receipt.gasUsed.toString()} Status: ${receipt.status}`);
        
        // Parse logs
        for (const log of receipt.logs) {
            try {
                const parsedLog = contract.interface.parseLog(log);
                if (parsedLog.name === 'GameResult') {
                    console.log('\n--- Game Result ---');
                    console.log(`Player: ${parsedLog.args.player}`);
                    console.log(`Won: ${parsedLog.args.won}`);
                    console.log(`Payout: ${ethers.formatEther(parsedLog.args.hbarPayout)} HBAR`);
                    console.log(`XP Earned: ${parsedLog.args.xpEarned.toString()}`);
                    console.log(`Roll Result: ${parsedLog.args.rollResult.toString()}`);
                }
            } catch (e) {}
        }
        
        const xp = await contract.playerXP(wallet.address);
        console.log(`\nTotal Player XP: ${xp.toString()}`);

    } catch (e) {
        console.error('FAILED:', e.message);
    }
}

main();
