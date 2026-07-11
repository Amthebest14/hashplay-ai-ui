const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const playAddress = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
    
    const abi = ["function owner() public view returns (address)"];
    const contract = new ethers.Contract(playAddress, abi, provider);
    
    const owner = await contract.owner();
    console.log("Owner is:", owner);
    
    // Check .env keys
    require("dotenv").config({ path: "../.env" });
    const deployKey = new ethers.Wallet(process.env.DEPLOY_KEY);
    const ownerKey = new ethers.Wallet(process.env.OWNER_KEY);
    const operatorKey = new ethers.Wallet("0x" + process.env.HEDERA_OPERATOR_KEY);
    console.log("DEPLOY_KEY address:", deployKey.address);
    console.log("OWNER_KEY address:", ownerKey.address);
    console.log("OPERATOR_KEY address:", operatorKey.address);
}

main().catch(console.error);
