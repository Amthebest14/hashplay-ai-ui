const { Client, ContractInfoQuery, AccountId, ContractId } = require("@hashgraph/sdk");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID);
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V1_ID = "0.0.8103703";

    console.log("Checking V1 Info...");
    const info = await new ContractInfoQuery().setContractId(V1_ID).execute(client);

    console.log("Admin Key:", info.adminKey ? info.adminKey.toString() : "None (Immutable)");
    console.log("Account ID:", info.contractId.toString());
    console.log("Auto Renew Account:", info.autoRenewAccountId ? info.autoRenewAccountId.toString() : "None");
}

main().catch(console.error);
