const { Client, ContractExecuteTransaction, ContractFunctionParameters, AccountId, Hbar, TransferTransaction, ContractId, AccountBalanceQuery, PrivateKey } = require("@hashgraph/sdk");
const { ethers } = require("ethers");
require("dotenv").config({ path: "../.env" });

async function main() {
    const phrase = "dutch oven menu mean female network motor quarter main change crater thank toast deputy print essay empty then extend enjoy slim brain display visual";
    const treasuryId = AccountId.fromString(process.env.VITE_TREASURY_ACCOUNT_ID); // 0.0.10627830
    
    // Get Ethereum ECDSA key from phrase
    const wallet = ethers.Wallet.fromPhrase(phrase);
    console.log("Ethereum Address:", wallet.address);
    console.log("Private Key Hex:", wallet.privateKey);
    
    // Convert to Hedera PrivateKey
    // ethers prepends '0x' to the private key, we need to strip it
    const pkBytes = Buffer.from(wallet.privateKey.substring(2), 'hex');
    const hederaKey = PrivateKey.fromBytesECDSA(pkBytes);
    
    const client = Client.forMainnet().setOperator(treasuryId, hederaKey);
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
