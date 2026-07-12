require("dotenv").config({ path: "../.env" });
const { Client, PrivateKey, AccountId, ContractId, ContractExecuteTransaction, ContractFunctionParameters } = require("@hashgraph/sdk");
const fs = require("fs");
const path = require("path");

const NEW_OWNER = "0.0.10627830";
const AIRDROP_POOL = 10_000_000n; // 10M PLAY
const TOKEN_DECIMALS = 8n;
const BATCH_SIZE = 50;
const CONTRACT_ADDRESS = "0x165C38e572B6B8b0c2A29e4150a57072bD31e37D";

async function main() {
    console.log(`\n=== Restoring Final Batch via Hedera SDK ===`);
    const seasonData = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../src/data/season1.json"), "utf8"));
    const players = seasonData.map(p => ({ address: p.account, xp: BigInt(p.xp) }));
    
    const totalXP = players.reduce((s, p) => s + p.xp, 0n);
    const poolUnits = AIRDROP_POOL * (10n ** TOKEN_DECIMALS);
    
    const airdropList = players.map(p => ({
        address: p.address,
        xp: p.xp,
        playAmount: (p.xp * poolUnits) / totalXP
    })).filter(p => p.playAmount > 0n);
    
    const batches = Math.ceil(airdropList.length / BATCH_SIZE);
    
    // ONLY RUN THE LAST BATCH (index 8)
    const b = 8;
    const slice = airdropList.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const addrs = slice.map(p => p.address);
    const amounts = slice.map(p => p.playAmount);
    const xpSnaps = slice.map(p => p.xp);

    const privateKey = PrivateKey.fromString(process.env.OWNER_KEY);
    const accountId = AccountId.fromString(NEW_OWNER);
    const client = Client.forMainnet();
    client.setOperator(accountId, privateKey);

    const contractId = ContractId.fromEvmAddress(0, 0, CONTRACT_ADDRESS);

    const params = new ContractFunctionParameters()
        .addAddressArray(addrs)
        .addUint256Array(amounts.map(a => a.toString()))
        .addUint256Array(xpSnaps.map(x => x.toString()));

    try {
        const tx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(2_000_000)
            .setFunction("batchAirdrop", params);

        const response = await tx.execute(client);
        const receipt = await response.getReceipt(client);
        console.log(`  Batch ${b + 1}/${batches} ✅ ${slice.length} players restored. Status: ${receipt.status.toString()}`);
    } catch(e) {
        console.error(`  Batch ${b + 1}/${batches} ❌ Error: ${e.message}`);
    }

    console.log(`\n=== RESTORE COMPLETE ===`);
    process.exit(0);
}

main().catch(console.error);
