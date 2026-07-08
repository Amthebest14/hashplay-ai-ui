const { Client, ContractExecuteTransaction, ContractFunctionParameters, AccountBalanceQuery, AccountId, PrivateKey } = require("@hashgraph/sdk");
const path = require('path');
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_KEY);
    const client = Client.forMainnet().setOperator(operatorId, operatorKey);

    const contractId = "0.0.10420650";

    console.log("--- STARTING WITHDRAW TO TREASURY ---");

    // 124.8 HBAR = 12480000000 tinybars
    const amountToWithdraw = "12480000000";
    console.log(`Withdrawing ${amountToWithdraw} tinybars from contract to treasury...`);

    try {
        const tx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(1000000)
            .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(amountToWithdraw))
            .execute(client);

        const receipt = await tx.getReceipt(client);
        console.log("Withdraw successful. Status:", receipt.status.toString());
    } catch (e) {
        console.error("Withdraw failed:", e.message);
    }

    // Query Treasury Balance
    const balance = await new AccountBalanceQuery()
        .setAccountId(operatorId)
        .execute(client);

    console.log(`New Treasury Balance: ${balance.hbars.toString()}`);
    console.log("--- FINISHED ---");
}

main().catch(console.error);
