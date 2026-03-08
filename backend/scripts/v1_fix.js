const { Client, AccountBalanceQuery, ContractId, TokenId, AccountId, ContractExecuteTransaction, Hbar, TokenAssociateTransaction, TransferTransaction, ContractFunctionParameters, ContractCallQuery } = require("@hashgraph/sdk");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID);
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V1_ID = "0.0.8103703";
    const TOKEN_ID = process.env.VITE_HASHPLAY_TOKEN_ID;

    console.log("--- V1 VERIFICATION ---");

    // 1. Check Balance
    const v1Balance = await new AccountBalanceQuery().setAccountId(V1_ID).execute(client);
    const tinybars = v1Balance.hbars.toTinybars();
    console.log(`V1 Balance: ${tinybars.toString()} tinybars`);

    // 2. Check Owner
    try {
        const query = await new ContractCallQuery()
            .setContractId(V1_ID)
            .setGas(100000)
            .setFunction("owner")
            .execute(client);
        const ownerHex = query.getAddress(0);
        console.log(`V1 Contract Owner (HEX): ${ownerHex}`);
        console.log(`Treasury HEX: ${operatorId.toSolidityAddress()}`);
    } catch (e) {
        console.log("Could not fetch owner:", e.message);
    }

    // 3. Attempt Partial Withdrawal
    if (tinybars.gt(1000000)) {
        console.log("Attempting to withdraw 99% of HBAR...");
        // 99% of balance
        const withdrawAmountTinybars = tinybars.multipliedBy(0.99).integerValue();
        const withdrawAmountWei = withdrawAmountTinybars.multipliedBy(1e10);

        console.log(`Withdraw Target: ${withdrawAmountTinybars.toString()} tinybars (${withdrawAmountWei.toString()} wei)`);

        const tx = await new ContractExecuteTransaction()
            .setContractId(V1_ID)
            .setGas(1000000)
            .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(withdrawAmountWei.toString()))
            .execute(client);
        const receipt = await tx.getReceipt(client);
        console.log("Status:", receipt.status.toString());
    }
}

main().catch(console.error);
