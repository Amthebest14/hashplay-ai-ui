const { Client, AccountId, TokenId, TransferTransaction, Hbar, PrivateKey } = require("@hashgraph/sdk");

async function main() {
    const operatorId = AccountId.fromString("0.0.7810956");
    const operatorKey = PrivateKey.fromStringECDSA("0xe2668a034746f62381eccd4fb7d0f35ecc9c00100b62061a6f9673b4513a7f15");
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const targetId = AccountId.fromString("0.0.8119191");
    const tokenId = TokenId.fromString("0.0.8076828");

    console.log("--- SEEDING V2 BANKROLL ---");
    console.log(`From: ${operatorId}`);
    console.log(`To: ${targetId}`);

    // User requested: 100 HBAR + 1 Million $HASHPLAY
    const fundHbar = new Hbar(100);
    const fundTokens = 100000000000000n; // 1M (8 decimals = 1,000,000.00000000)

    try {
        const tx = await new TransferTransaction()
            .addHbarTransfer(operatorId, fundHbar.negated())
            .addHbarTransfer(targetId, fundHbar)
            .addTokenTransfer(tokenId, operatorId, -fundTokens)
            .addTokenTransfer(tokenId, targetId, fundTokens)
            .execute(client);

        const receipt = await tx.getReceipt(client);
        console.log("Transfer Status:", receipt.status.toString());
        console.log("Successfully sent 100 HBAR and 1,000,000 $HASHPLAY");
    } catch (e) {
        console.error("Transfer failed:", e.message);
    }
}

main().catch(console.error);
