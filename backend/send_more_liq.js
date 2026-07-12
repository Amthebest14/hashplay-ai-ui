const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet("0x" + process.env.HEDERA_OPERATOR_KEY, provider);
    
    const bal = await provider.getBalance(wallet.address);
    console.log("Operator Balance:", ethers.formatEther(bal), "HBAR");
    
    // We want to leave about 1 HBAR for gas fees
    const gasReserve = ethers.parseEther("1.0");
    
    if (bal > gasReserve) {
        const sendAmount = bal - gasReserve;
        console.log("Sending", ethers.formatEther(sendAmount), "HBAR to new PlayToken...");
        
        const newPlay = "0x6E165d21dd0B57da3F75CC56C97F9d3C82e42c81";
        const tx = await wallet.sendTransaction({
            to: newPlay,
            value: sendAmount
        });
        
        console.log("Transaction submitted. Hash:", tx.hash);
        await tx.wait();
        console.log("Successfully sent additional liquidity.");
    } else {
        console.log("Not enough balance to send more liquidity.");
    }
}

main().catch(console.error);
