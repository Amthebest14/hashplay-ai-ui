const { ethers } = require("hardhat");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

async function main() {
    const V2_ADDRESS = "0x789b9F3977508488FDDcCa5570a662080528";
    const TOKEN_ID = process.env.VITE_HASHPLAY_TOKEN_ID;
    console.log("Funding V2 Contract:", V2_ADDRESS);

    const [signer] = await ethers.getSigners();
    console.log("Using operator:", signer.address);

    const abi = [
        "function selfAssociate() external",
        "function fundBankroll() external payable",
        "function hashplayToken() view returns (address)"
    ];

    const arena = new ethers.Contract(V2_ADDRESS, abi, signer);

    try {
        console.log("Associating V2 with $HASHPLAY...");
        // In V2 I added selfAssociate or I can just call the HTS precompile associate from a script?
        // Actually the V2 contract has a fundBankroll() function.
        // Wait, I didn't add selfAssociate to V2. I'll use a script to call HTS precompile directly 
        // OR just have the contract associate itself on first transfer.
        // Actually, I can just use the Hedera SDK or another ethers call.

        // I'll use a simple association script logic.
        const HTS_PRECOMPILE = "0x0000000000000000000000000000000000000167";
        const htsAbi = ["function associateToken(address account, address token) external returns (int64)"];
        const hts = new ethers.Contract(HTS_PRECOMPILE, htsAbi, signer);

        const hashplayTokenAddress = "0x00000000000000000000000000000000007b3e1c"; // 0.0.8076828

        console.log("Associating contract...");
        const associateTx = await hts.associateToken(V2_ADDRESS, hashplayTokenAddress, { gasLimit: 1000000 });
        await associateTx.wait();
        console.log("Association confirmed.");

        console.log("Funding 2800 HBAR...");
        const fundHbarTx = await signer.sendTransaction({
            to: V2_ADDRESS,
            value: ethers.parseEther("2800"),
            gasLimit: 100000
        });
        await fundHbarTx.wait();
        console.log("HBAR Funded!");

        console.log("Funding 20,800,000 Tokens...");
        // Token contract
        const tokenAbi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const tokenContract = new ethers.Contract(hashplayTokenAddress, tokenAbi, signer);

        const tokenAmount = 2080000000000000n; // 20,800,000 * 10^8
        const tokenTx = await tokenContract.transfer(V2_ADDRESS, tokenAmount, { gasLimit: 1000000 });
        await tokenTx.wait();
        console.log("Tokens Funded!");

        console.log("V2 fully funded and ready.");
    } catch (e) {
        console.error("Funding failed:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
