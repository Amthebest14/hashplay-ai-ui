require("dotenv").config({ path: "../.env" });
const fs = require("fs");
const path = require("path");
const { Client, PrivateKey, AccountId, ContractCreateFlow, Hbar } = require("@hashgraph/sdk");

const TREASURY_WALLET = "0x0000000000000000000000000000000000A22AF6"; // 0.0.10627830
const PLAY_TOKEN      = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
const SENDER_ID = "0.0.10418925";
const SENDER_KEY = process.env.HEDERA_OPERATOR_KEY;

async function main() {
    console.log("Deploying HashplayArenaV6 via Hedera SDK with 25 HBAR wallet...");

    const client = Client.forMainnet();
    client.setOperator(AccountId.fromString(SENDER_ID), PrivateKey.fromStringECDSA(SENDER_KEY));
    client.setDefaultMaxTransactionFee(new Hbar(15)); // Set max transaction fee to 15 HBAR
    
    // Read the compiled contract bytecode
    const artifactPath = path.resolve(__dirname, "artifacts/contracts/HashplayArenaV6.sol/HashplayArenaV6.json");
    if (!fs.existsSync(artifactPath)) {
        console.error("Compile the contract first with: npx hardhat compile");
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const bytecode = artifact.bytecode;

    const { ContractFunctionParameters } = require("@hashgraph/sdk");
    
    const constructorParams = new ContractFunctionParameters()
        .addAddress(TREASURY_WALLET)
        .addAddress(PLAY_TOKEN);

    const contractCreateFlow = new ContractCreateFlow()
        .setBytecode(bytecode)
        .setGas(800_000)
        .setConstructorParameters(constructorParams);

    const txResponse = await contractCreateFlow.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const newContractId = receipt.contractId;
    
    console.log(`✅ ArenaV6 deployed at Contract ID: ${newContractId.toString()}`);
    console.log(`✅ EVM Address: ${newContractId.toSolidityAddress()}`);

    const address = `0x${newContractId.toSolidityAddress()}`;

    // Update config
    const configPath = path.resolve(__dirname, "../src/config.json");
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        config.ARENA_ADDRESS = address;
        config.PLAY_TOKEN_ADDRESS = PLAY_TOKEN;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log("✅ Updated frontend config.json");
    }

    console.log("\nNext Steps:");
    console.log(`1. Call setMinter('${address}', true) on PlayToken`);
    
    client.close();
}

main().catch(console.error);
