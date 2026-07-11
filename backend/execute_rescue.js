const { Client, ContractExecuteTransaction, ContractFunctionParameters, AccountId, Hbar, Mnemonic, TransferTransaction, ContractId, AccountBalanceQuery } = require("@hashgraph/sdk");
require("dotenv").config({ path: "../.env" });

async function main() {
    const phrase = "dutch oven menu mean female network motor quarter main change crater thank toast deputy print essay empty then extend enjoy slim brain display visual";
    const treasuryId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID); // 0.0.10627830
    const mnemonic = await Mnemonic.fromString(phrase);
    
    let validKey = null;
    
    for (let i = 0; i < 10; i++) {
        console.log(`Testing index ${i}...`);
        const keys = [
            await mnemonic.toStandardEd25519PrivateKey("", i),
            await mnemonic.toStandardECDSAsecp256k1PrivateKey("", i)
        ];
        
        for (let key of keys) {
            const client = Client.forMainnet().setOperator(treasuryId, key);
            try {
                const tx = new TransferTransaction()
                    .addHbarTransfer(treasuryId, new Hbar(0))
                    .addHbarTransfer(treasuryId, new Hbar(0));
                const response = await tx.execute(client);
                await response.getReceipt(client);
                validKey = key;
                console.log(`Found valid key at index ${i}!`);
                break;
            } catch (e) {
                // Ignore
            }
        }
        if (validKey) break;
    }
    
    if (!validKey) {
        console.error("Could not find a valid key from the 24-word phrase for this account up to index 10.");
        process.exit(1);
    }
    
    const client = Client.forMainnet().setOperator(treasuryId, validKey);
    const oldPlayEvm = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
    const contractId = ContractId.fromEvmAddress(0, 0, oldPlayEvm);
    
    console.log("Withdrawing 51 HBAR...");
    try {
        const tx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(200000)
            .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(5100000001));
            
        const response = await tx.execute(client);
        await response.getReceipt(client);
        console.log("Withdrawal Status: SUCCESS");
    } catch (e) {
        console.error("Error withdrawing:", e.message);
    }
    
    // Check balance before transfer
    const balanceQuery = new AccountBalanceQuery().setAccountId(treasuryId);
    const balance = await balanceQuery.execute(client);
    console.log(`Treasury Balance: ${balance.hbars.toString()}`);
    
    // Transfer almost everything to Operator
    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
    const sendAmount = balance.hbars.toBigNumber().toNumber() - 1.0; 
    
    if (sendAmount > 0) {
        console.log(`Transferring ${sendAmount} HBAR to Operator...`);
        const transferTx = new TransferTransaction()
            .addHbarTransfer(treasuryId, new Hbar(-sendAmount))
            .addHbarTransfer(operatorId, new Hbar(sendAmount));
            
        const transferRes = await transferTx.execute(client);
        await transferRes.getReceipt(client);
        console.log("Transfer Status: SUCCESS");
    }
    
    console.log("✅ Successfully rescued HBAR and funded Operator!");
    process.exit(0);
}

main().catch(console.error);
