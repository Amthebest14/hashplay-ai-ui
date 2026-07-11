require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");
const { Client, PrivateKey, AccountId, ContractExecuteTransaction, ContractFunctionParameters } = require("@hashgraph/sdk");

async function main() {
    const client = Client.forMainnet();
    client.setOperator(AccountId.fromString("0.0.10627830"), PrivateKey.fromString(process.env.OWNER_KEY));

    // ethers.parseEther('25') returns a BigInt (25 * 10^18)
    const amountToWithdraw = ethers.parseEther("25");

    console.log(`Withdrawing ${amountToWithdraw.toString()} wei (25 HBAR) from PlayToken...`);

    const tx = new ContractExecuteTransaction()
        .setContractId("0.0.10628895")
        .setGas(200_000)
        .setFunction("withdrawHBAR", new ContractFunctionParameters().addUint256(amountToWithdraw.toString()));

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    
    console.log("Withdrawal Status:", receipt.status.toString());
    client.close();
}

main().catch(console.error);
