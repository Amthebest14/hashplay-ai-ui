require("dotenv").config({ path: "../.env" });
const { Client, PrivateKey, AccountId, TransferTransaction, Hbar } = require("@hashgraph/sdk");

const SENDER_ID = "0.0.10627830";
const SENDER_KEY = process.env.OWNER_KEY;
const RECEIVER_ID = "0.0.10418925";

async function main() {
    const client = Client.forMainnet();
    client.setOperator(AccountId.fromString(SENDER_ID), PrivateKey.fromString(SENDER_KEY));

    const sendTx = new TransferTransaction()
        .addHbarTransfer(SENDER_ID, new Hbar(-8))
        .addHbarTransfer(RECEIVER_ID, new Hbar(8));

    const response = await sendTx.execute(client);
    const receipt = await response.getReceipt(client);

    console.log(`Transfer status: ${receipt.status}`);
    client.close();
}

main().catch(console.error);
