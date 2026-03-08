const { Client, AccountId, ContractId, ContractCallQuery, ContractFunctionParameters } = require("@hashgraph/sdk");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID);
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V1_ID = "0.0.8103703";

    try {
        console.log(`Querying owner of ${V1_ID}...`);
        const query = await new ContractCallQuery()
            .setContractId(V1_ID)
            .setGas(100000)
            .setFunction("owner")
            .execute(client);

        const ownerHex = query.getAddress(0);
        console.log("Owner (HEX):", ownerHex);
        console.log("Our Treasury Solidity Address:", operatorId.toSolidityAddress());
    } catch (e) {
        console.error("Query failed:", e.message);
    }
}

main().catch(console.error);
