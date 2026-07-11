const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const operatorWallet = new ethers.Wallet("0x" + process.env.HEDERA_OPERATOR_KEY, provider);
    const ownerWallet = new ethers.Wallet(process.env.OWNER_KEY, provider);
    
    console.log("Operator Balance:", ethers.formatEther(await provider.getBalance(operatorWallet.address)));
    console.log("Funding OWNER_KEY from OPERATOR_KEY with 0.1 HBAR...");
    
    const txFund = await operatorWallet.sendTransaction({
        to: ownerWallet.address,
        value: ethers.parseEther("0.1"),
        gasLimit: 100000
    });
    console.log("Hash:", txFund.hash);
    await txFund.wait();
    console.log("OWNER_KEY funded.");
}

main().catch(console.error);
