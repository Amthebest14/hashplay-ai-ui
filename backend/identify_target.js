const MIRROR_BASE = "https://mainnet-public.mirrornode.hedera.com";
const MIRROR = `${MIRROR_BASE}/api/v1`;

async function main() {
    const targetId = "0.0.10505801";

    console.log(`Checking history for Target (${targetId}) to identify it...`);

    const txRes = await fetch(`${MIRROR}/transactions?account.id=${targetId}&order=desc&limit=20`);
    const txData = await txRes.json();
    
    let isExchange = false;
    
    for (const tx of (txData.transactions || [])) {
        console.log(`\nTX: ${tx.transaction_id} | Type: ${tx.name}`);
        // see if target sends to multiple people or is interacting with smart contracts
        for (const t of tx.transfers) {
           console.log(`   Transfer: ${t.account} -> ${t.amount / 1e8} HBAR`);
        }
    }
}

main().catch(console.error);
