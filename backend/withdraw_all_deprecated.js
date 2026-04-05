require('dotenv').config({ path: '../.env' });
const { 
    Client, 
    ContractExecuteTransaction, 
    Hbar, 
    AccountId, 
    PrivateKey,
    ContractId
} = require("@hashgraph/sdk");

async function main() {
    // Setup Hedera Client
    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY);
    const client = Client.forMainnet().setOperator(operatorId, operatorKey);

    // List of contracts to drain
    const contracts = [
        '0.0.10418933', // V3
        '0.0.10419246', // V4
        '0.0.10419442', // V4-Opt
        '0.0.10420289', // V5-Fail-1
        '0.0.10420291'  // V5-Fail-2
    ];

    console.log("🚀 Starting Bulk Withdrawal to Treasury...");

    for (const contractId of contracts) {
        try {
            console.log(`\n--- Fetching balance for ${contractId} ---`);
            
            // 1. Get Balance via Mirror Node
            const balanceRes = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/balances?account.id=${contractId}`);
            const balanceData = await balanceRes.json();
            
            if (!balanceData.balances || balanceData.balances.length === 0) {
                console.log(`No balance data for ${contractId}`);
                continue;
            }

            const tinybars = parseInt(balanceData.balances[0].balance);
            
            // Only drain if balance > 0.1 HBAR
            if (tinybars < 10000000) {
                console.log(`Skipping ${contractId}: Low balance (${tinybars / 1e8} HBAR)`);
                continue;
            }

            console.log(`Draining ${tinybars / 1e8} HBAR (${tinybars} tinybars) from ${contractId}...`);

            // 2. Call withdrawHBAR(uint256 amount)
            // Function selector for withdrawHBAR(uint256) is 0x56a65522
            const amountHex = BigInt(tinybars).toString(16).padStart(64, '0');
            const functionParameters = Buffer.from("56a65522" + amountHex, 'hex');

            const tx = await new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(contractId))
                .setGas(100000) // Withdrawal is very efficient
                .setFunctionParameters(functionParameters)
                .execute(client);

            const receipt = await tx.getReceipt(client);
            console.log(`✅ ${contractId} Successfully Drained! Status: ${receipt.status.toString()}`);

        } catch (error) {
            console.error(`❌ FAILED for ${contractId}:`, error.message);
        }
    }

    console.log("\n--- Finalizing... ---");
    const treasuryBalanceRes = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/balances?account.id=${process.env.HEDERA_OPERATOR_ID}`);
    const treasuryData = await treasuryBalanceRes.json();
    console.log(`🎯 New Treasury Balance: ${parseInt(treasuryData.balances[0].balance) / 1e8} HBAR`);
}

main().catch(console.error);
