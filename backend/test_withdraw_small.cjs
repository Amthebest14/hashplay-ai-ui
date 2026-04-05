require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

async function main() {
    const provider = new ethers.JsonRpcProvider('https://mainnet.hashio.io/api');
    const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);
    
    const contracts = [
        { id: '0.0.10418933', address: '0x2a38cf870e8e40ea10e8da100f179f01f7463a78' },
        { id: '0.0.10419246', address: '0xb20526efbd008bb488f760f222ce9afb712f7024' },
        { id: '0.0.10419442', address: '0x5526d4024b2324e9468ae6bb50e09253c93ec020' }
    ];

    const abi = ['function withdrawHBAR(uint256 amount) external'];

    for (const c of contracts) {
        try {
            const checksumAddress = ethers.getAddress(c.address.toLowerCase());
            console.log(`\nWithdrawing 0.1 HBAR from ${c.id}...`);
            const contract = new ethers.Contract(checksumAddress, abi, wallet);
            // Try 0.1 HBAR (10^17 weibars)
            const tx = await contract.withdrawHBAR(ethers.parseEther('0.1'), { gasLimit: 500000 });
            await tx.wait();
            console.log(`✅ Success for ${c.id}`);
        } catch (error) {
            console.error(`❌ Failed for ${c.id}: ${error.message}`);
        }
    }
}

main().catch(console.error);
