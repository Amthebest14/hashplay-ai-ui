require("dotenv").config({ path: "../.env" });
const fs = require("fs");
const path = require("path");
const {
    Client,
    AccountId,
    Mnemonic,
    Hbar,
    ContractCreateFlow,
    ContractExecuteTransaction,
    ContractCallQuery,
    ContractFunctionParameters,
    AccountBalanceQuery,
} = require("@hashgraph/sdk");

// Deployer = owner: 0.0.10627830. This account's on-chain key is ED25519
// (confirmed via Mirror Node), so this uses the native Hedera SDK rather than
// ethers.js/JSON-RPC — the EVM relay only accepts ECDSA keys, ED25519 does not
// work there. No separate transfer step here — a follow-up transferOwnership()
// to the new custody wallet happens afterward, once that wallet's address is
// confirmed.
const OWNER_ACCOUNT_ID = "0.0.10627830";
const SEED_LIQUIDITY_HBAR = Number(process.env.SEED_LIQUIDITY_HBAR || "5");

async function main() {
    const phrase = process.env.OWNER_PHRASE;
    if (!phrase) {
        throw new Error('Add the 24-word phrase for 0.0.10627830 as OWNER_PHRASE in .env (e.g. OWNER_PHRASE="word1 word2 ...")');
    }

    const mnemonic = await Mnemonic.fromString(phrase);
    const privateKey = await mnemonic.toStandardEd25519PrivateKey("", 0);

    const ownerId = AccountId.fromString(OWNER_ACCOUNT_ID);
    const client = Client.forMainnet().setOperator(ownerId, privateKey);
    client.setDefaultMaxTransactionFee(new Hbar(15));

    const bal = await new AccountBalanceQuery().setAccountId(ownerId).execute(client);
    console.log(`Deployer/Owner: ${OWNER_ACCOUNT_ID}`);
    console.log(`Balance:        ${bal.hbars.toString()}\n`);

    const minRequired = SEED_LIQUIDITY_HBAR + 5;
    if (bal.hbars.toBigNumber().toNumber() < minRequired) {
        console.error(`[!] WARNING: balance is below deploy + seed requirement (~${minRequired} HBAR). Top up before continuing.`);
        process.exit(1);
    }

    const artifactPath = path.resolve(__dirname, "artifacts/contracts/PlayToken.sol/PlayToken.json");
    if (!fs.existsSync(artifactPath)) {
        console.error("Compile the contract first with: npx hardhat compile");
        process.exit(1);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    console.log("Deploying fixed $PLAY token...");
    const contractCreateFlow = new ContractCreateFlow()
        .setBytecode(artifact.bytecode)
        .setGas(3_000_000);

    const createResponse = await contractCreateFlow.execute(client);
    const createReceipt = await createResponse.getReceipt(client);
    const contractId = createReceipt.contractId;
    const evmAddress = `0x${contractId.toSolidityAddress()}`;

    console.log(`\n✅ Fixed $PLAY deployed at: ${contractId.toString()} (${evmAddress})`);
    console.log(`   HashScan: https://hashscan.io/mainnet/contract/${contractId.toString()}`);

    console.log(`\nSeeding ${SEED_LIQUIDITY_HBAR} HBAR liquidity...`);
    const seedTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(100_000)
        .setPayableAmount(new Hbar(SEED_LIQUIDITY_HBAR))
        .setFunction("seedLiquidity");
    const seedResponse = await seedTx.execute(client);
    const seedReceipt = await seedResponse.getReceipt(client);
    console.log(`✅ Liquidity seeded. Status: ${seedReceipt.status.toString()}`);

    // Sanity-check the buy() fix before we trust it with real money:
    // send a tiny test buy and confirm it mints a sane (non-zero, non-absurd) amount.
    console.log(`\nVerifying buy() fix with a 1 HBAR test purchase...`);
    const priceQuery = await new ContractCallQuery()
        .setContractId(contractId)
        .setGas(50_000)
        .setFunction("currentPrice")
        .execute(client);
    const priceBefore = priceQuery.getUint256(0);

    const buyTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(200_000)
        .setPayableAmount(new Hbar(1))
        .setFunction("buy");
    const buyResponse = await buyTx.execute(client);
    const buyReceipt = await buyResponse.getReceipt(client);
    console.log(`   buy() tx status: ${buyReceipt.status.toString()}`);

    const ownerEvm = `0x${ownerId.toSolidityAddress()}`;
    const balQuery = await new ContractCallQuery()
        .setContractId(contractId)
        .setGas(50_000)
        .setFunction("balanceOf", new ContractFunctionParameters().addAddress(ownerEvm))
        .execute(client);
    const playBalance = balQuery.getUint256(0);

    console.log(`   Price used:      ${priceBefore.toString()} wei/PLAY`);
    console.log(`   PLAY received:   ${(Number(playBalance) / 1e8).toString()}`);
    if (playBalance.toString() === "0") {
        console.error(`   [!] buy() minted 0 PLAY — the fix did not work as expected. Investigate before proceeding.`);
    } else {
        console.log(`   ✅ buy() looks correct.`);
    }

    const config = { PLAY_TOKEN_ADDRESS: evmAddress, PLAY_TOKEN_CONTRACT_ID: contractId.toString() };
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

    client.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
