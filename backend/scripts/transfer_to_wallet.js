const { Client, TransferTransaction, Hbar, AccountId, PrivateKey } = require("@hashgraph/sdk");
const path = require('path');
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
    const operatorId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_OPERATOR_KEY);
    const client = Client.forMainnet().setOperator(operatorId, operatorKey);

    const userWallet = "0.0.7534334";

    console.log("--- STARTING TRANSFER TO USER WALLET ---");

    // Transfer 124.5 HBAR (leaving some for gas)
    const amountToTransfer = new Hbar(124.5);
    console.log(`Transferring ${amountToTransfer.toString()} to ${userWallet}...`);
    
    try {
        const tx = await new TransferTransaction()
            .addHbarTransfer(operatorId, amountToTransfer.negated())
            .addHbarTransfer(userWallet, amountToTransfer)
            .execute(client);
        
        const receipt = await tx.getReceipt(client);
        console.log("Transfer successful. Status:", receipt.status.toString());
    } catch (e) {
        console.error("Transfer failed:", e.message);
    }

    console.log("--- FINISHED ---");
}

main().catch(console.error);
