require('dotenv').config({ path: '../.env' });
const { Client, TokenAssociateTransaction, AccountId, TokenId, PrivateKey } = require('@hashgraph/sdk');

async function main() {
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_KEY);
    const operatorId = "0.0.7810956";
    const contractEvmAddress = process.env.VITE_MINING_ENGINE_ADDRESS;
    const tokenId = TokenId.fromString(process.env.VITE_HASHPLAY_TOKEN_ID);

    if (!operatorKey || !contractEvmAddress) {
        throw new Error("Missing env vars.");
    }

    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    // Get Account ID from EVM Address for the contract
    const contractId = AccountId.fromEvmAddress(0, 0, contractEvmAddress);

    console.log(`Associating Contract: ${contractId.toString()} (${contractEvmAddress})`);
    console.log(`With Token: ${tokenId.toString()}`);

    try {
        // Since we are the operator and the contract doesn't have its own Hedera Key (it's an EVM address),
        // we might need to use the HTS precompile or a specific association trick.
        // However, on Hedera Testnet/Mainnet, if the contract was created via EVM, it acts as an account.
        // Associate transaction:
        const transaction = await new TokenAssociateTransaction()
            .setAccountId(contractId)
            .setTokenIds([tokenId])
            .freezeWith(client);

        // NOTE: This usually requires the account's signature. 
        // If the contract has no key, it might be tricky.
        // However, often for Smart Contracts, we use the HTS Precompile *inside* the contract.
        // Let's check if we can do it from outside first.

        const signTx = await transaction.sign(operatorKey);
        const response = await signTx.execute(client);
        const receipt = await response.getReceipt(client);

        console.log(`✅ Association Status: ${receipt.status.toString()}`);
    } catch (e) {
        console.error("❌ Association failed:", e.message);
        console.log("\nIf this failed, we may need to call a function on the contract that uses the HTS Precompile to associate itself.");
    }
}

main().catch(console.error);
