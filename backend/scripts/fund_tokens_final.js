const { Client, AccountId, PrivateKey, TokenTransferTransaction } = require("@hashgraph/sdk");

async function main() {
    // Treasury: 0.0.7810956
    const operatorId = AccountId.fromString("0.0.7810956");
    const operatorKey = PrivateKey.fromString("0xe2668a034746f62381eccd4fb7d0f35ecc9c00100b62061a6f9673b4513a7f15");
    const tokenId = "0.0.8076828";

    // Contract: 0.0.8103703
    const targetId = AccountId.fromString("0.0.8103703");

    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    console.log(`Funding contract ${targetId} with 20,000,000 $HASHPLAY...`);

    // BigInt for 20,000,000 * 10^8
    const amount = 20000000n * 100000000n;

    const transaction = await new TokenTransferTransaction()
        .addTokenTransfer(tokenId, operatorId, -amount)
        .addTokenTransfer(tokenId, targetId, amount)
        .execute(client);

    const receipt = await transaction.getReceipt(client);
    console.log(`Funding Success! Status: ${receipt.status.toString()}`);
}

main().catch(console.error);
