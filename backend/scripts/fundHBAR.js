/**
 * Fund the HashplayGame contract with HBAR (for paying out winners).
 * Run: node scripts/fundHBAR.js
 */

require("dotenv").config({ path: "../.env" });
const { Client, AccountId, PrivateKey, TransferTransaction, Hbar } = require("@hashgraph/sdk");

const CONTRACT_EVM_ADDRESS = "0x34784BD5c6ec6eF811b1CE2Be564a7Eb60fA5Acb";
const TREASURY_ACCOUNT = process.env.VITE_TREASURY_ACCOUNT_ID || "0.0.7810956";
const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;
const HBAR_AMOUNT = 900;

async function main() {
    if (!OPERATOR_KEY) throw new Error("HEDERA_OPERATOR_KEY not set in .env");

    const client = Client.forTestnet();
    const treasuryAccountId = AccountId.fromString(TREASURY_ACCOUNT);
    const operatorKey = PrivateKey.fromStringECDSA(OPERATOR_KEY);
    client.setOperator(treasuryAccountId, operatorKey);

    // Resolve EVM contract address to Hedera Account ID
    console.log("Looking up Hedera Account ID for contract:", CONTRACT_EVM_ADDRESS);
    const mirrorRes = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${CONTRACT_EVM_ADDRESS}`);
    const mirrorData = await mirrorRes.json();
    if (!mirrorData.account) throw new Error("Contract account not found on Mirror Node");
    const contractAccountId = AccountId.fromString(mirrorData.account);
    console.log("✅ Contract Account ID:", contractAccountId.toString());

    // Transfer HBAR
    console.log(`\nSending ${HBAR_AMOUNT} HBAR to contract...`);
    const tx = new TransferTransaction()
        .addHbarTransfer(treasuryAccountId, new Hbar(-HBAR_AMOUNT))
        .addHbarTransfer(contractAccountId, new Hbar(HBAR_AMOUNT))
        .freezeWith(client);

    const signed = await tx.sign(operatorKey);
    const res = await signed.execute(client);
    const receipt = await res.getReceipt(client);

    console.log("✅ Transfer status:", receipt.status.toString());
    console.log(`✅ Contract now funded with ${HBAR_AMOUNT} HBAR for winner payouts!`);
}

main().catch(err => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
