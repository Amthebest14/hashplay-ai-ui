const MIRROR_BASE = "https://mainnet-public.mirrornode.hedera.com";
const MIRROR = `${MIRROR_BASE}/api/v1`;

async function main() {
    const treasuryId = "0.0.10418925";
    const targetId = "0.0.10505801";
    const contractId = "0.0.10420650";

    console.log(`Investigating transfers from Treasury (${treasuryId}) to Target (${targetId})...`);

    // 1. Get info about Target ID
    const targetRes = await fetch(`${MIRROR}/accounts/${targetId}`);
    if (!targetRes.ok) {
        console.log(`Failed to fetch target info: ${targetRes.statusText}`);
    } else {
        const targetData = await targetRes.json();
        console.log(`Target Info:`);
        console.log(`  EVM Address: ${targetData.evm_address}`);
        console.log(`  Balance: ${targetData.balance?.balance / 1e8} HBAR`);
        console.log(`  Memo: ${targetData.memo}`);
    }

    // 2. Check if Target ever played our contract
    const contractRes = await fetch(`${MIRROR}/contracts/${contractId}/results?limit=100&order=desc`);
    const contractData = await contractRes.json();
    // we need to get the evm address of the target to check the results since from is an evm address
    
    // Instead of querying contract results by evm_address (not supported directly), we can query target's transactions targeting the contract
    const txTargetContract = await fetch(`${MIRROR}/transactions?account.id=${targetId}&order=desc&limit=100`);
    const txTargetData = await txTargetContract.json();
    let playedGame = false;
    for (const tx of (txTargetData.transactions || [])) {
        if (tx.entity_id === contractId && tx.name === 'CONTRACTCALL') {
            playedGame = true;
            break;
        }
    }
    if (playedGame) {
        console.log(`\n✅ Target HAS played our contract.`);
    } else {
        console.log(`\n❌ Target has NEVER played our contract.`);
    }

    // 3. Find the transfer from Treasury to Target
    console.log(`\nChecking Recent transactions involving Target:`);
    let foundTransfer = false;
    for (const tx of (txTargetData.transactions || [])) {
        let fromTreasury = 0;
        let toTarget = 0;
        for (const t of tx.transfers) {
            if (t.account === treasuryId && t.amount < 0) fromTreasury = Math.abs(t.amount);
            if (t.account === targetId && t.amount > 0) toTarget = t.amount;
        }

        if (fromTreasury > 0 && toTarget > 0) {
            foundTransfer = true;
            console.log(`\n🚨 FOUND TRANSFER FROM TREASURY!`);
            console.log(`  Date: ${new Date(parseFloat(tx.consensus_timestamp) * 1000).toLocaleString()}`);
            console.log(`  Amount sent to Target: ${toTarget / 1e8} HBAR`);
            console.log(`  Transaction ID: ${tx.transaction_id}`);
            console.log(`  Type: ${tx.name}`);
            console.log(`  Memo: ${atob(tx.memo_base64 || '')}`);
        } else if (fromTreasury > 0) {
             console.log(`Found a tx involving Treasury, but target didn't receive...`);
        }
    }

    if (!foundTransfer) {
        // Let's check Treasury's outgoing transactions just in case
        console.log(`\nDid not find in target's history. Checking Treasury's history...`);
        const txTreasury = await fetch(`${MIRROR}/transactions?account.id=${treasuryId}&transactiontype=CRYPTOTRANSFER&order=desc&limit=50`);
        const txTreasuryData = await txTreasury.json();
        for (const tx of (txTreasuryData.transactions || [])) {
            let fromTreasury = 0;
            let toTarget = 0;
            for (const t of tx.transfers) {
                if (t.account === treasuryId && t.amount < 0) fromTreasury = Math.abs(t.amount);
                if (t.account === targetId && t.amount > 0) toTarget = t.amount;
            }
            if (fromTreasury > 0 && toTarget > 0) {
                console.log(`\n🚨 FOUND TRANSFER FROM TREASURY IN TREASURY LOGS!`);
                console.log(`  Date: ${new Date(parseFloat(tx.consensus_timestamp) * 1000).toLocaleString()}`);
                console.log(`  Amount sent to Target: ${toTarget / 1e8} HBAR`);
                console.log(`  Transaction ID: ${tx.transaction_id}`);
                console.log(`  Type: ${tx.name}`);
            }
        }
    }

}

main().catch(console.error);
