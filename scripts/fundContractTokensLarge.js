import { Client, AccountId, PrivateKey, TokenTransferTransaction } from "@hashgraph/sdk";
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    // Treasury: 0.0.7810956
    const operatorId = AccountId.fromString("0.0.7810956");
    console.log("Operator ID:", operatorId.toString());
    console.log("Token ID:", process.env.VITE_HASHPLAY_TOKEN_ID);
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY || "");
    const tokenId = process.env.VITE_HASHPLAY_TOKEN_ID || "";

    // Contract: 0.0.8103703
    const targetId = AccountId.fromString("0.0.8103703");

    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    console.log(`Funding contract ${targetId} with 20,000,000 $HASHPLAY...`);

    // 20,000,000 * 10^8 (8 decimals)
    const amount = 20000000 * 100000000;

    const transaction = await new TokenTransferTransaction()
        .addTokenTransfer(tokenId, operatorId, -amount)
        .addTokenTransfer(tokenId, targetId, amount)
        .execute(client);

    const receipt = await transaction.getReceipt(client);
    console.log(`Funding Success! Status: ${receipt.status.toString()}`);
}

main().catch(console.error);
