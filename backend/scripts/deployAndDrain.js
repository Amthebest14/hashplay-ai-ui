/**
 * Compile and deploy HashplayWithdraw.sol — a minimal helper to drain HBAR.
 */
const path = require('path');
const fs = require('fs');
const solc = require('solc');
require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

// ─── Compile ──────────────────────────────────────────────────────────────────
const contractPath = path.resolve(__dirname, '..', 'contracts', 'HashplayWithdraw.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: { 'HashplayWithdraw.sol': { content: source } },
    settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } },
};

const compiled = JSON.parse(solc.compile(JSON.stringify(input)));
if (compiled.errors?.some(e => e.severity === 'error')) {
    compiled.errors.forEach(e => console.error(e.formattedMessage));
    process.exit(1);
}
const contract = compiled.contracts['HashplayWithdraw.sol']['HashplayWithdraw'];
const { abi, bytecode } = { abi: contract.abi, bytecode: contract.evm.bytecode.object };

console.log("Compiled HashplayWithdraw.sol");

// ─── Deploy ───────────────────────────────────────────────────────────────────
async function main() {
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    console.log(`Deploying from: ${wallet.address}`);

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    const addr = await deployed.getAddress();
    console.log(`\nDeployed at: ${addr}\n`);

    // Save for use
    fs.writeFileSync(
        path.resolve(__dirname, '..', 'HashplayWithdraw.json'),
        JSON.stringify({ address: addr, abi }, null, 2)
    );

    // ─── Now drain each old contract ────────────────────────────────────────
    const OLD_ABI = [
        "function withdrawHBAR(uint256 amount) external",
        "function owner() view returns (address)"
    ];
    const OLD_CONTRACTS = [
        "0x34784BD5c6ec6eF811b1CE2Be564a7Eb60fA5Acb",
        "0x9bA4B928EC233E41E449Dd9DDF01a7Ac6A4fcdfA",
        "0x3dFbaE03D03461683b4A5173C45D7CC8Cb5754dC",
        "0xDf0765E451fA616FAfDfF7008E35d6369bc9E771",
        "0x24B07c29385563F312106F624D54F7ecFD9b113A",
    ];

    const walletBefore = await provider.getBalance(wallet.address);
    console.log(`Wallet balance before: ${ethers.formatEther(walletBefore)} HBAR`);

    for (const oldAddr of OLD_CONTRACTS) {
        const oldBal = await provider.getBalance(oldAddr);
        const hbar = parseFloat(ethers.formatEther(oldBal));
        console.log(`\n--- Old contract: ${oldAddr}`);
        console.log(`    Balance: ${hbar.toFixed(4)} HBAR`);

        if (hbar < 11) {
            console.log(`    -> Skipping (< 11 HBAR)`);
            continue;
        }

        // Withdraw from old contract into the wallet (owner = wallet.address)
        try {
            const old = new ethers.Contract(oldAddr, OLD_ABI, wallet);

            const RESERVE = ethers.parseEther("10");
            const withdrawAmt = oldBal - RESERVE;
            console.log(`    -> Calling withdrawHBAR(${ethers.formatEther(withdrawAmt)}) on old contract`);

            const tx = await old.withdrawHBAR(withdrawAmt, {
                gasLimit: 300000,
                // Hedera may need this for HBAR transfer operations
            });
            console.log(`    TX: ${tx.hash}`);
            const r = await tx.wait();
            console.log(`    Status: ${r.status === 1 ? "SUCCESS ✅" : "REVERTED ❌"}`);
        } catch (e) {
            console.log(`    Error: ${e.message.slice(0, 200)}`);
        }
    }

    const walletAfter = await provider.getBalance(wallet.address);
    console.log(`\nWallet balance after: ${ethers.formatEther(walletAfter)} HBAR`);
    console.log(`Net recovered: ${ethers.formatEther(walletAfter - walletBefore)} HBAR`);
}

main().catch(console.error);
