require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

async function main() {
    const provider = new ethers.JsonRpcProvider('https://mainnet.hashio.io/api');
    const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
    
    // Addresses to withdraw from (lowercased to avoid checksum errors)
    const contracts = [
        { id: '0.0.10418933', address: '0x2a38cf870e8e40ea10e8da100f179f01f7463a78' },
        { id: '0.0.10419246', address: '0xb20526efbd008bb488f760f222ce9afb712f7024' },
        { id: '0.0.10419442', address: '0x5526d4024b2324e9468ae6bb50e09253c93ec020' }
    ];

    const abi = ['function withdrawHBAR(uint256 amount) external'];

    for (const c of contracts) {
        try {
            const checksumAddress = ethers.getAddress(c.address.toLowerCase());
            console.log(`\nChecking balance for ${c.id} (${checksumAddress})...`);
            const balance = await provider.getBalance(checksumAddress);
            console.log(`Current balance: ${ethers.formatEther(balance)} HBAR`);
            
            if (balance > 0n) {
                console.log(`Withdrawing all ${ethers.formatEther(balance)} HBAR from ${c.id}...`);
                const contract = new ethers.Contract(checksumAddress, abi, wallet);
                const tx = await contract.withdrawHBAR(balance, { gasLimit: 500000 });
                console.log(`Withdraw transaction submitted: ${tx.hash}`);
                await tx.wait();
                console.log(`✅ Withdrawal complete for ${c.id}`);
            } else {
                console.log(`No balance to withdraw from ${c.id}`);
            }
        } catch (error) {
            console.error(`❌ Process failed for ${c.id}:`, error.message);
        }
    }
}

main().catch(console.error);
