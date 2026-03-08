const { Client, AccountId, TokenId, TransferTransaction, Hbar, PrivateKey } = require("@hashgraph/sdk");

async function main() {
    // Treasury account and key from .env
    const id = "0.0.7810956";
    const key = "0xe2668a034746f62381eccd4fb7d0f35ecc9c00100b62061a6f9673b4513a7f15";

    const operatorId = AccountId.fromString(id);
    // REMOVE 0x if present for SDK parsing
    const cleanKey = key.startsWith("0x") ? key.substring(2) : key;
    const operatorKey = PrivateKey.fromStringECDSA(cleanKey);

    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    const V2_ID = "0.0.8119191";
    const TOKEN_ID = "0.0.8076828";

    console.log("--- FINAL SOLVENCY PUSH ---");

    // Push 500 HBAR and 20 Million tokens to V2
    const hbarAmount = new Hbar(500);
    const tokenAmount = 2000000000000000n; // 20M (8 decimals)

    try {
        const tx = await new TransferTransaction()
            .addHbarTransfer(operatorId, hbarAmount.negated())
            .addHbarTransfer(V2_ID, hbarAmount)
            .addTokenTransfer(TokenId.fromString(TOKEN_ID), operatorId, -tokenAmount)
            .addTokenTransfer(TokenId.fromString(TOKEN_ID), V2_ID, tokenAmount)
            .execute(client);

        const receipt = await tx.getReceipt(client);
        console.log("Funding Status:", receipt.status.toString());
    } catch (e) {
        console.error("Funding failed:", e.message);
    }
}

main();
