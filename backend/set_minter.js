require("dotenv").config({ path: "../.env" });
const { ethers } = require("hardhat");

const PLAY_TOKEN_ADDRESS = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
const ARENA_ADDRESS = "0xf3bE968617F4958390946aEF09EFCbD0E0f20c13";

async function main() {
    console.log("Granting Minter role to ArenaV6...");

    const PlayToken = await ethers.getContractFactory("PlayToken");
    const playToken = PlayToken.attach(PLAY_TOKEN_ADDRESS);

    // Call setMinter
    const tx = await playToken.setMinter(ARENA_ADDRESS, true, { gasLimit: 200000 });
    await tx.wait();

    console.log(`Successfully granted minter role to ArenaV6: ${ARENA_ADDRESS}`);
}

main().catch(console.error);
