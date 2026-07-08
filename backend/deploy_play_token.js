require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const NEW_OWNER = "0x0000000000000000000000000000000000A22AF6"; // 0.0.10627830 (secure wallet)

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(process.env.DEPLOY_KEY, provider);

    console.log(`\nDeploying $PLAY token...`);
    console.log(`Deployer: ${wallet.address}`);

    const bal = await provider.getBalance(wallet.address);
    console.log(`Balance:  ${ethers.formatEther(bal)} HBAR\n`);

    // Load compiled artifact
    const artifact = JSON.parse(
        fs.readFileSync(
            path.resolve(__dirname, "artifacts/contracts/PlayToken.sol/PlayToken.json"),
            "utf8"
        )
    );

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    // Deploy (no constructor args)
    const contract = await factory.deploy({ gasLimit: 3_000_000 });
    console.log(`Tx hash:  ${contract.deploymentTransaction().hash}`);
    console.log(`Waiting for confirmation...`);
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log(`\n✅ $PLAY deployed at: ${address}`);
    console.log(`   HashScan: https://hashscan.io/mainnet/contract/${address}`);

    // Seed 50 HBAR liquidity for sell backing
    console.log(`\nSeeding 50 HBAR liquidity...`);
    const seedTx = await contract.seedLiquidity({ value: ethers.parseEther("50"), gasLimit: 100_000 });
    await seedTx.wait();
    console.log(`✅ 50 HBAR seeded. Tx: ${seedTx.hash}`);

    // Verify deployment
    const price = await contract.currentPrice();
    const supply = await contract.totalSupply();
    console.log(`\n── Verification ─────────────────────────────`);
    console.log(`   Starting price: ${ethers.formatEther(price)} HBAR per PLAY`);
    console.log(`   Total supply:   ${ethers.formatUnits(supply, 8)} PLAY`);
    console.log(`   Contract HBAR:  50 HBAR (seeded)`);
    console.log(`─────────────────────────────────────────────`);

    // Save address for other scripts
    const config = { PLAY_TOKEN_ADDRESS: address };
    fs.writeFileSync(
        path.resolve(__dirname, "play_token_config.json"),
        JSON.stringify(config, null, 2)
    );
    console.log(`\nAddress saved to play_token_config.json`);
}

main().catch(console.error);
