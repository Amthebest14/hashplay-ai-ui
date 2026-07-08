const { ethers } = require("ethers");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const abi = ["function owner() external view returns (address)"];
    const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS || "0xcec25013ece3ec5a1b090261880eb2aeb7ffb9c8";
    const contract = new ethers.Contract(contractAddress, abi, provider);
    try {
        const owner = await contract.owner();
        console.log("Owner is:", owner);
    } catch (e) {
        console.error("Failed to get owner:", e.message);
    }
}
main();
