require("dotenv").config({ path: "../.env" });
const { Client, PrivateKey, AccountId, ContractId, ContractExecuteTransaction, ContractFunctionParameters } = require("@hashgraph/sdk");

const OWNER_ID = "0.0.10627830";
const OWNER_KEY = process.env.OWNER_KEY;

const PLAY_TOKEN_EVM = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
const ARENA_ADDRESS = "0x0000000000000000000000000000000000a2306e";

async function main() {
    console.log("Granting Minter role to ArenaV6 via Hedera SDK...");

    const client = Client.forMainnet();
    client.setOperator(AccountId.fromString(OWNER_ID), PrivateKey.fromString(OWNER_KEY));

    const contractExecTx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromEvmAddress(0, 0, PLAY_TOKEN_EVM))
        .setGas(200_000)
        .setFunction("setMinter", new ContractFunctionParameters()
            .addAddress(ARENA_ADDRESS)
            .addBool(true)
        );

    const submitExecTx = await contractExecTx.execute(client);
    const receipt2 = await submitExecTx.getReceipt(client);

    console.log("setMinter execution status:", receipt2.status.toString());
}

main().catch(console.error);
