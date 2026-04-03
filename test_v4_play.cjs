require('dotenv').config({ path: './.env' });
const { ethers } = require('ethers');

async function main() {
    const provider = new ethers.JsonRpcProvider('https://mainnet.hashio.io/api');
    const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
    
    const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;
    const abi = ['function play(uint8 gameType, uint8 prediction) external payable'];
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    const gasLimits = [2000000, 3000000, 4000000];
    
    for (const gasLimit of gasLimits) {
        console.log(`\nTesting gasLimit: ${gasLimit.toLocaleString()}...`);
        try {
            const tx = await contract.play(2, 1, { 
                value: ethers.parseEther('1'), 
                gasLimit 
            });
            console.log('Tx submitted:', tx.hash);
            const receipt = await tx.wait();
            console.log(`SUCCESS! Gas used: ${receipt.gasUsed.toString()} Status: ${receipt.status}`);
            break; // Stop on first success
        } catch (e) {
            const msg = e.message || '';
            if (msg.includes('INSUFFICIENT_GAS') || msg.includes('reverted')) {
                console.log(`FAILED (gas likely too low)`);
            } else {
                console.log('FAILED:', msg.substring(0, 200));
            }
        }
    }
}

main();
