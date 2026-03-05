/**
 * Fund the HashplayGame contract with $HASHPLAY tokens.
 * 
 * This script:
 * 1. Looks up the Hedera account ID of the deployed EVM contract
 * 2. Associates the contract account with the $HASHPLAY token (required by Hedera HTS)
 * 3. Transfers $HASHPLAY tokens from the treasury to the contract
 * 
 * Run: node scripts/fundContract.js
 */

require("dotenv").config({ path: "../.env" });
const {
    Client,
    AccountId,
    PrivateKey,
    TokenAssociateTransaction,
    TransferTransaction,
    TokenId,
    ContractId,
    Hbar
} = require("@hashgraph/sdk");

const CONTRACT_EVM_ADDRESS = "0x34784BD5c6ec6eF811b1CE2Be564a7Eb60fA5Acb";
const TOKEN_ID = process.env.VITE_HASHPLAY_TOKEN_ID || "0.0.8076828";
const TREASURY_ACCOUNT = process.env.VITE_TREASURY_ACCOUNT_ID || "0.0.7810956";
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;

// Amount of $HASHPLAY tokens to fund (8 decimals)
// 1,000,000 tokens = 1,000,000 * 1e8 = 100,000,000,000,000
const FUND_AMOUNT = 1_000_000 * 1e8;

async function main() {
    if (!OPERATOR_KEY) throw new Error("HEDERA_OPERATOR_KEY not set in .env");

    const client = Client.forTestnet();
    const treasuryAccountId = AccountId.fromString(TREASURY_ACCOUNT);
    const operatorKey = PrivateKey.fromStringECDSA(OPERATOR_KEY);
    client.setOperator(treasuryAccountId, operatorKey);

    // Step 1: Resolve the EVM contract address to a Hedera Account ID
    console.log("Looking up Hedera Account ID for contract:", CONTRACT_EVM_ADDRESS);
    const mirrorRes = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/accounts/${CONTRACT_EVM_ADDRESS}`
    );
    const mirrorData = await mirrorRes.json();
    if (!mirrorData.account) {
        throw new Error("Could not find Hedera account for contract address. Is the contract deployed?");
    }
    const contractAccountId = AccountId.fromString(mirrorData.account);
    console.log("✅ Contract Hedera Account ID:", contractAccountId.toString());

    // Step 2: Associate the contract with $HASHPLAY token using HTS precompile
    // We do this by executing a function on the contract that calls HTS.associateToken
    // Alternatively, we update the contract to allow max auto-associations
    console.log("\nAssociating contract with $HASHPLAY token via AccountUpdateTransaction...");
    try {
        const { AccountUpdateTransaction } = require("@hashgraph/sdk");
        const updateTx = new AccountUpdateTransaction()
            .setAccountId(contractAccountId)
            .setMaxAutomaticTokenAssociations(10)
            .freezeWith(client);

        // Sign with operator (treasury) key — works because treasury deployed the contract
        const signedUpdateTx = await updateTx.sign(operatorKey);
        const updateRes = await signedUpdateTx.execute(client);
        const updateReceipt = await updateRes.getReceipt(client);
        console.log("✅ Auto-association set:", updateReceipt.status.toString());
    } catch (err) {
        console.log("⚠️  Could not update auto-associations:", err.message);
        console.log("    Continuing — contract may already accept tokens...");
    }

    // Step 3: Transfer $HASHPLAY tokens from treasury to the contract
    console.log(`\nTransferring ${FUND_AMOUNT / 1e8} $HASHPLAY tokens to contract...`);
    const transferTx = new TransferTransaction()
        .addTokenTransfer(TokenId.fromString(TOKEN_ID), treasuryAccountId, -BigInt(FUND_AMOUNT))
        .addTokenTransfer(TokenId.fromString(TOKEN_ID), contractAccountId, BigInt(FUND_AMOUNT))
        .freezeWith(client);

    const signedTransferTx = await transferTx.sign(operatorKey);
    const transferRes = await signedTransferTx.execute(client);
    const transferReceipt = await transferRes.getReceipt(client);
    console.log("✅ Transfer status:", transferReceipt.status.toString());
    console.log(`✅ Contract funded with 1,000,000 $HASHPLAY tokens!`);
    console.log(`\nContract is now ready to pay out game rewards.`);
}

main().catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
