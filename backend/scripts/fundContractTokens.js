require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

async function main() {
    const hashplayTokenId = process.env.VITE_HASHPLAY_TOKEN_ID;
    const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;

    if (!hashplayTokenId || !contractAddress || !operatorKey) {
        throw new Error("Missing required environment variables.");
    }

    // Convert Token ID to EVM Address
    const tokenEvmAddress = "0x00000000000000000000000000000000" + parseInt(hashplayTokenId.split('.')[2]).toString(16).padStart(8, '0');

    console.log(`Funding Contract: ${contractAddress}`);
    console.log(`Token Address: ${tokenEvmAddress}`);

    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    const ERC20_ABI = [
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function decimals() public view returns (uint8)",
        "function balanceOf(address account) public view returns (uint256)"
    ];

    const tokenContract = new ethers.Contract(tokenEvmAddress, ERC20_ABI, wallet);

    const amountToFund = 1000000n * (10n ** 8n); // 1M tokens with 8 decimals

    console.log(`Attempting to transfer 1,000,000 $HASHPLAY tokens...`);

    try {
        const tx = await tokenContract.transfer(contractAddress, amountToFund);
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Successfully funded contract with 1,000,000 $HASHPLAY tokens.`);
    } catch (error) {
        console.error("Transfer failed:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
