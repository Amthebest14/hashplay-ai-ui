require("dotenv").config({ path: "../.env" });
const { ethers } = require("hardhat");

const PLAY_TOKEN_ADDRESS = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";

async function main() {
    const PlayToken = await ethers.getContractFactory("PlayToken");
    const playToken = PlayToken.attach(PLAY_TOKEN_ADDRESS);

    const supply = await playToken.totalSupply();
    console.log("Total Supply:", ethers.formatUnits(supply, 8)); // 8 decimals
}

main().catch(console.error);
