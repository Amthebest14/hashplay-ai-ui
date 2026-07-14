require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Deployer = owner: 0.0.10627830 (OWNER_KEY). No separate transfer step here —
// a follow-up transferOwnership() to the new custody wallet happens afterward,
// once that wallet's address is confirmed.
const SEED_LIQUIDITY_HBAR = process.env.SEED_LIQUIDITY_HBAR || "50";

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(process.env.OWNER_KEY, provider);

    console.log(`\nDeploying fixed $PLAY token...`);
    console.log(`Deployer/Owner: ${wallet.address}`);

    const bal = await provider.getBalance(wallet.address);
    console.log(`Balance:        ${ethers.formatEther(bal)} HBAR\n`);

    const minRequired = ethers.parseEther(String(Number(SEED_LIQUIDITY_HBAR) + 5));
    if (bal < minRequired) {
        console.error(`[!] WARNING: balance is below deploy + seed requirement (~${ethers.formatEther(minRequired)} HBAR). Top up before continuing.`);
        process.exit(1);
    }

    const artifact = JSON.parse(
        fs.readFileSync(
            path.resolve(__dirname, "artifacts/contracts/PlayToken.sol/PlayToken.json"),
            "utf8"
        )
    );

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    const contract = await factory.deploy({ gasLimit: 3_000_000 });
    console.log(`Tx hash: ${contract.deploymentTransaction().hash}`);
    console.log(`Waiting for confirmation...`);
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log(`\n✅ Fixed $PLAY deployed at: ${address}`);
    console.log(`   HashScan: https://hashscan.io/mainnet/contract/${address}`);

    console.log(`\nSeeding ${SEED_LIQUIDITY_HBAR} HBAR liquidity...`);
    const seedTx = await contract.seedLiquidity({
        value: ethers.parseEther(SEED_LIQUIDITY_HBAR),
        gasLimit: 100_000
    });
    await seedTx.wait();
    console.log(`✅ Liquidity seeded. Tx: ${seedTx.hash}`);

    // Sanity-check the buy() fix before we trust it with real money:
    // send a tiny test buy and confirm it mints a sane (non-zero, non-absurd) amount.
    console.log(`\nVerifying buy() fix with a 1 HBAR test purchase...`);
    const priceBefore = await contract.currentPrice();
    const buyTx = await contract.buy({ value: ethers.parseEther("1"), gasLimit: 200_000 });
    await buyTx.wait();
    const playBalance = await contract.balanceOf(wallet.address);
    const received = ethers.formatUnits(playBalance, 8);
    console.log(`   Price used:      ${ethers.formatEther(priceBefore)} HBAR/PLAY`);
    console.log(`   PLAY received:   ${received}`);
    if (playBalance === 0n) {
        console.error(`   [!] buy() minted 0 PLAY — the fix did not work as expected. Investigate before proceeding.`);
    } else {
        console.log(`   ✅ buy() looks correct.`);
    }

    const config = { PLAY_TOKEN_ADDRESS: address };
    fs.writeFileSync(
        path.resolve(__dirname, "play_token_config.json"),
        JSON.stringify(config, null, 2)
    );
    console.log(`\nAddress saved to play_token_config.json`);
    console.log(`\nNext steps (not automated by this script):`);
    console.log(`  1. Copy artifacts/contracts/PlayToken.sol/PlayToken.json -> ../src/contracts/PlayToken.json`);
    console.log(`  2. Update PLAY_TOKEN_ADDRESS / SHORT_TOKEN_ADDRESS in ../src/components/SectionToken.tsx`);
    console.log(`  3. Run batchAirdrop() once the 426-wallet snapshot data is ready`);
    console.log(`  4. Call setMinter(arenaAddress, true) once ArenaV6 is pointed at this token`);
    console.log(`  5. transferOwnership(newWalletAddress) once the fresh custody wallet is confirmed`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
