const { Client, ContractExecuteTransaction, ContractFunctionParameters, AccountId, Hbar, Mnemonic, TransferTransaction } = require("@hashgraph/sdk");
require("dotenv").config({ path: "../.env" });

async function main() {
    console.log("Starting Rescue via Hedera SDK...");
    
    const phrase = process.env.TREASURY_PHRASE;
    if (!phrase) {
        throw new Error("Please add your 12-word phrase as TREASURY_PHRASE in .env (e.g., TREASURY_PHRASE=\"word1 word2 ...\")");
    }

    // Recover the private key from the 12-word phrase
    let privateKey;
    try {
        const mnemonic = await Mnemonic.fromString(phrase);
        // HashPack default derivation for Hedera ED25519 accounts
        privateKey = await mnemonic.toStandardEd25519PrivateKey("", 0); 
    } catch (e) {
        // Fallback to ECDSA if it was created that way
        const mnemonic = await Mnemonic.fromString(phrase);
        privateKey = await mnemonic.toStandardECDSAsecp256k1PrivateKey("", 0);
    }
    
    const treasuryId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID); // 0.0.10627830
    const client = Client.forMainnet().setOperator(treasuryId, privateKey);
    
    const OLD_PLAY_ID = "0.0.8066538"; // I need the actual Hedera Contract ID for 0x204D71684c5F33ACbEc3182EE07B875910a0E1c8
    
    // We can get the contract ID from the EVM address by converting it, or just use the EVM address directly in the SDK (supported in recent versions)
    const oldPlayEvm = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
    
    console.log("Withdrawing 51 HBAR...");
    // 5100000001 tinybars = 5100000001
    const tx = new ContractExecuteTransaction()
        .setContractId(oldPlayEvm)
        .setGas(200000)
        .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(5100000001));
        
    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    console.log("Withdrawal Status:", receipt.status.toString());
    
    console.log("\nTransferring 5 HBAR to Operator...");
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const transferTx = new TransferTransaction()
        .addHbarTransfer(treasuryId, Hbar.from(-5))
        .addHbarTransfer(operatorId, Hbar.from(5));
        
    const transferRes = await transferTx.execute(client);
    const transferReceipt = await transferRes.getReceipt(client);
    console.log("Transfer Status:", transferReceipt.status.toString());
    
    console.log("✅ Successfully rescued HBAR and funded Operator!");
    process.exit(0);
}

main().catch(console.error);
