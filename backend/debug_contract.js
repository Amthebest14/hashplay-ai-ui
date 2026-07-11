const { ethers } = require("ethers");

async function main() {
    const res = await fetch("https://mainnet-public.mirrornode.hedera.com/api/v1/contracts/0x204D71684c5F33ACbEc3182EE07B875910a0E1c8");
    const json = await res.json();
    console.log("Contract Info:", json);
}

main().catch(console.error);
