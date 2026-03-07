const { ethers } = require("hardhat");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

async function main() {
    const V1_ADDRESS = process.env.VITE_MINING_ENGINE_ADDRESS; // 0x2EaD75a67364d726bbf9B4bb955B4F5E1D85Ad50
    console.log("Draining V1 Contract:", V1_ADDRESS);

    const [signer] = await ethers.getSigners();
    console.log("Using operator:", signer.address);

    // V1 Withdraw ABI
    const abi = [
        "function withdrawHBAR(uint256 amount) external",
        "function withdrawTokens(uint256 amount) external",
        "function hashplayToken() view returns (address)"
    ];

    const contract = new ethers.Contract(V1_ADDRESS, abi, signer);

    try {
        console.log("Withdrawing 2800 HBAR...");
        // 2800 HBAR = 2800 * 10^18 tinybars (EVM representation)
        // Wait, Hedera HBAR on EVM is 18 decimals.
        const hbarAmount = ethers.parseEther("2800");
        const hbarTx = await contract.withdrawHBAR(hbarAmount, { gasLimit: 1000000 });
        await hbarTx.wait();
        console.log("HBAR Withdrawn!");

        console.log("Withdrawing 800,000 Tokens...");
        // Tokens have 8 decimals
        const tokenAmount = 80000000000000n; // 800,000 * 10^8
        const tokenTx = await contract.withdrawTokens(tokenAmount, { gasLimit: 1000000 });
        await tokenTx.wait();
        console.log("Tokens Withdrawn!");

        console.log("V1 Drained successfully.");
    } catch (e) {
        console.error("Drain failed:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
