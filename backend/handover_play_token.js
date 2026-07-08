require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

const PLAY_TOKEN    = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
const NEW_OWNER     = "0x0000000000000000000000000000000000A22AF6"; // 0.0.10627830
const SWEEP_TO      = "0x000000000000000000000000000000000072F6FE"; // 0.0.7534334

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet   = new ethers.Wallet(process.env.DEPLOY_KEY, provider);

    const abi = ["function transferOwnership(address newOwner) external"];
    const contract = new ethers.Contract(PLAY_TOKEN, abi, wallet);

    // Step 1: Transfer ownership
    console.log("Transferring PlayToken ownership to 0.0.10627830...");
    const tx1 = await contract.transferOwnership(NEW_OWNER, { gasLimit: 100_000 });
    await tx1.wait();
    console.log(`✅ Ownership transferred. Tx: ${tx1.hash}`);

    // Step 2: Sweep remaining HBAR from deploy wallet
    await new Promise(r => setTimeout(r, 2000));
    const bal      = await provider.getBalance(wallet.address);
    const feeData  = await provider.getFeeData();
    const gasCost  = 21000n * feeData.maxFeePerGas;
    const sendAmt  = bal - gasCost;

    if (sendAmt > 0n) {
        console.log(`\nSweeping ${ethers.formatEther(sendAmt)} HBAR back to 0.0.7534334...`);
        const tx2 = await wallet.sendTransaction({
            to: SWEEP_TO,
            value: sendAmt,
            gasLimit: 21000n,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        });
        await tx2.wait();
        console.log(`✅ Swept. Tx: ${tx2.hash}`);
    }

    console.log(`\n── Final State ──────────────────────────────────`);
    console.log(`   PlayToken:  ${PLAY_TOKEN}`);
    console.log(`   Owner:      0.0.10627830`);
    console.log(`   Deploy wallet: empty & done`);
    console.log(`────────────────────────────────────────────────`);
}

main().catch(console.error);
