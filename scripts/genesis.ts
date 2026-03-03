import {
    Client,
    PrivateKey,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType
} from "@hashgraph/sdk";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const operatorId = process.env.VITE_TREASURY_ACCOUNT_ID;
const operatorKey = process.env.HEDERA_OPERATOR_KEY;

if (!operatorId || !operatorKey) {
    throw new Error("Must set VITE_TREASURY_ACCOUNT_ID and HEDERA_OPERATOR_KEY in .env");
}

// Ensure ECDSA hex keys have the 0x prefix if they are raw 32-bytes
const formattedKey = operatorKey.startsWith('0x') ? operatorKey : `0x${operatorKey}`;

// Parse explicitly as ECDSA
const treasuryKey = PrivateKey.fromStringECDSA(formattedKey);

const client = Client.forTestnet();
client.setOperator(operatorId, treasuryKey);

async function main() {
    console.log("Initializing $HASHPLAY Ecosystem Genesis...");

    // Create the $HASHPLAY token
    const tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName("Hashplay AI")
        .setTokenSymbol("$HASHPLAY")
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(8)
        .setInitialSupply(100_000_000 * 10 ** 8) // 100M Supply
        .setTreasuryAccountId(operatorId)
        .setAdminKey(treasuryKey)
        .setSupplyKey(treasuryKey)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(100_000_000 * 10 ** 8)
        .freezeWith(client);

    // Sign the transaction with the treasury key
    const signTx = await tokenCreateTx.sign(treasuryKey);
    const submitTx = await signTx.execute(client);
    const receipt = await submitTx.getReceipt(client);

    const tokenId = receipt.tokenId;
    console.log(`\n✅ GENESIS SUCCESS! $HASHPLAY Token ID: ${tokenId}`);

    // Update .env file automatically
    const envPath = path.resolve(process.cwd(), ".env");
    let envData = "";

    if (fs.existsSync(envPath)) {
        envData = fs.readFileSync(envPath, "utf8");
    }

    if (envData.includes("VITE_HASHPLAY_TOKEN_ID=")) {
        envData = envData.replace(/VITE_HASHPLAY_TOKEN_ID=.*/g, `VITE_HASHPLAY_TOKEN_ID="${tokenId}"`);
    } else {
        envData += `\nVITE_HASHPLAY_TOKEN_ID="${tokenId}"\n`;
    }

    fs.writeFileSync(envPath, envData);
    console.log(`✅ Automatically injected VITE_HASHPLAY_TOKEN_ID into .env`);

    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
