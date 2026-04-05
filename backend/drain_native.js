require('dotenv').config({ path: '../.env' });
const { 
    Client, 
    ContractExecuteTransaction, 
    ContractCallQuery,
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

    const contracts = [
        '0.0.10418933', 
        '0.0.10419246', 
        '0.0.10419442', 
        '0.0.10420289'
    ];

    for (const contractId of contracts) {
        try {
            console.log(`\n--- Draining ${contractId} ---`);
            
            // 1. Get Balance
            const balanceRes = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/balances?account.id=${contractId}`);
            const balanceData = await balanceRes.json();
            const tinybars = balanceData.balances[0].balance;
            
            if (tinybars <= 10000000) { // Less than 0.1 HBAR
                console.log(`Skipping ${contractId}, balance too low: ${tinybars / 1e8} HBAR`);
                continue;
            }

            console.log(`Balance: ${tinybars / 1e8} HBAR (${tinybars} tinybars)`);

            // 2. Execute withdrawHBAR(uint256 amount)
            // Using Hedera SDK ContractExecuteTransaction handles units natively in tinybars for the ledger.
            // Function: withdrawHBAR(uint256 amount) -> 0x56a65522 + 32-byte amount
            const tx = await new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(contractId))
                .setGas(100000) // Simple withdrawal should be cheap
                .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(tinybars))
                .execute(client);

            const receipt = await tx.getReceipt(client);
            console.log(`✅ Success! Status: ${receipt.status.toString()}`);

        } catch (error) {
            console.error(`❌ Failed for ${contractId}:`, error.message);
        }
    }
}

// Helper class for parameters since we aren't using the full ethers approach here
class ContractFunctionParameters {
    constructor() { this.args = []; }
    addUint256(val) {
        // Simple hex padding for a single uint256
        const hex = BigInt(val).toString(16).padStart(64, '0');
        this.args.push(hex);
        return this;
    }
    // Very simplified, only for this specific call
    build(funcName) {
        // Selector for withdrawHBAR(uint256) is 0x56a65522
        return Buffer.from("56a65522" + this.args.join(''), 'hex');
    }
}

// Redefining the execute to use our raw parameters
async function executeCustom(contractId, amount, client) {
    const params = new ContractFunctionParameters().addUint256(amount);
    const tx = await new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(contractId))
        .setGas(100000)
        .setFunctionParameters(params.build())
        .execute(client);
    return await tx.getReceipt(client);
}

// Override main logic to use the custom executor
async function mainFixed() {
    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY);
    const client = Client.forMainnet().setOperator(operatorId, operatorKey);

    const contracts = ['0.0.10418933', '0.0.10419246', '0.0.10419442', '0.0.10420289'];

    for (const id of contracts) {
        try {
            const balanceRes = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/balances?account.id=${id}`);
            const balanceData = await balanceRes.json();
            const tinybars = balanceData.balances[0].balance;
            
            if (tinybars > 10000000) {
                console.log(`Draining ${id}: ${tinybars / 1e8} HBAR`);
                const receipt = await executeCustom(id, tinybars, client);
                console.log(`✅ ${id} status: ${receipt.status.toString()}`);
            }
        } catch (e) { console.error(`${id} failed: ${e.message}`); }
    }
}

mainFixed().catch(console.error);
