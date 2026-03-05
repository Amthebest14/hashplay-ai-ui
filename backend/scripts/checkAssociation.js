require('dotenv').config({ path: '../.env' });
const { Client, AccountId, TokenId, AccountInfoQuery } = require('@hashgraph/sdk');

async function main() {
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const operatorId = "0.0.7810956"; // Treasury/Operator
    const contractEvmAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

    if (!operatorKey || !contractEvmAddress) {
        throw new Error("Missing env vars.");
    }

    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    // Get Account ID from EVM Address for the contract
    const contractId = AccountId.fromEvmAddress(0, 0, contractEvmAddress);
    const tokenId = TokenId.fromString(process.env.VITE_HASHPLAY_TOKEN_ID);

    console.log(`Checking Contract: ${contractId.toString()} (${contractEvmAddress})`);
    console.log(`Token: ${tokenId.toString()}`);

    try {
        const info = await new AccountInfoQuery()
            .setAccountId(contractId)
            .execute(client);

        const relationship = info.tokenRelationships.get(tokenId);
        if (relationship) {
            console.log(`✅ Associated: Yes`);
            console.log(`💰 Balance: ${relationship.balance.toString()}`);
        } else {
            console.log(`❌ Associated: No`);
        }
    } catch (e) {
        console.error("Failed to fetch info:", e.message);
    }
}

main().catch(console.error);
