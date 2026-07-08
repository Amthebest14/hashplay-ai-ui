require('dotenv').config({ path: '../.env' });
const { 
    Client, 
    ContractExecuteTransaction, 
    Hbar, 
    AccountId, 
    PrivateKey,
    ContractId,
    ContractFunctionParameters
} = require("@hashgraph/sdk");

async function main() {
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    
    // Explicitly use fromStringECDSA for EVM keys on Hedera
    const client = Client.forMainnet().setOperator(
        AccountId.fromString(operatorId),
        PrivateKey.fromStringECDSA(operatorKey)
    );

    const contracts = [
        "0.0.10420613" // Former V5.1 with 5 HBAR
    ];

    console.log("🚀 Starting FINAL Bulk Withdrawal to Treasury via Native SDK...");

    for (const id of contracts) {
        try {
            const balanceRes = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/balances?account.id=${id}`);
            const balanceData = await balanceRes.json();
            const tinybars = parseInt(balanceData.balances[0].balance);

            if (tinybars < 10000000) {
                console.log(`Skipping ${id}: Low balance (${tinybars / 1e8} HBAR)`);
                continue;
            }

            console.log(`Draining ${tinybars / 1e8} HBAR from ${id}...`);

            const tx = await new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(id))
                .setGas(100000)
                .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(tinybars))
                .execute(client);

            const receipt = await tx.getReceipt(client);
            console.log(`✅ Success for ${id}: ${receipt.status.toString()}`);

        } catch (e) {
            console.error(`❌ Error on ${id}: ${e.message}`);
        }
    }

    const tBalanceRes = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/balances?account.id=${operatorId}`);
    const tData = await tBalanceRes.json();
    console.log(`🎯 New Treasury Balance: ${parseInt(tData.balances[0].balance) / 1e8} HBAR`);
}

main().catch(console.error);
