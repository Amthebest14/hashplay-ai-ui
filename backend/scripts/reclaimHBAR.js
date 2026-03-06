/**
 * Reclaim HBAR from old contracts directly.
 * The contracts were deployed with the operator ECDSA key, 
 * so owner = the EVM address derived from that key.
 * We must call withdrawHBAR using that exact private key.
 */
require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

const OLD_CONTRACTS = [
    "0x34784BD5c6ec6eF811b1CE2Be564a7Eb60fA5Acb",  // 995 HBAR
    "0x9bA4B928EC233E41E449Dd9DDF01a7Ac6A4fcdfA",  // 90 HBAR
    "0x3dFbaE03D03461683b4A5173C45D7CC8Cb5754dC",  // 91 HBAR
    "0xDf0765E451fA616FAfDfF7008E35d6369bc9E771",
    "0x24B07c29385563F312106F624D54F7ecFD9b113A",
];

const ABI = [
    "function withdrawHBAR(uint256 amount) external",
    "function owner() view returns (address)"
];

const RESERVE = ethers.parseEther("10"); // leave 10 HBAR

async function main() {
    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
    const wallet = new ethers.Wallet(process.env.HEDERA_OPERATOR_KEY, provider);

    console.log(`Wallet address (owner): ${wallet.address}`);
    const startBal = await provider.getBalance(wallet.address);
    console.log(`Starting balance: ${ethers.formatEther(startBal)} HBAR\n`);

    for (const addr of OLD_CONTRACTS) {
        const bal = await provider.getBalance(addr);
        const hbar = parseFloat(ethers.formatEther(bal));
        console.log(`--- ${addr}`);
        console.log(`    Balance: ${hbar.toFixed(6)} HBAR`);

        // Verify owner
        const contract = new ethers.Contract(addr, ABI, wallet);
        let owner = "?";
        try { owner = await contract.owner(); } catch (e) { }
        const match = owner.toLowerCase() === wallet.address.toLowerCase();
        console.log(`    Owner: ${owner} (match: ${match ? "YES" : "NO"})`);

        if (!match) {
            console.log(`    -> Skipping (not owner)\n`);
            continue;
        }

        if (bal <= RESERVE) {
            console.log(`    -> Skipping (balance ≤ 10 HBAR)\n`);
            continue;
        }

        const withdrawAmt = bal - RESERVE;
        console.log(`    -> Withdrawing: ${ethers.formatEther(withdrawAmt)} HBAR`);

        try {
            const tx = await contract.withdrawHBAR(withdrawAmt, { gasLimit: 150000 });
            console.log(`    TX: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`    Status: ${receipt.status === 1 ? "SUCCESS ✅" : "FAILED ❌"}\n`);
        } catch (e) {
            console.log(`    Error: ${e.message.slice(0, 200)}\n`);
        }
    }

    const endBal = await provider.getBalance(wallet.address);
    console.log(`Final balance: ${ethers.formatEther(endBal)} HBAR`);
    console.log(`Recovered: ${ethers.formatEther(endBal - startBal)} HBAR`);
}

main().catch(console.error);
