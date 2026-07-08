const MIRROR_BASE = "https://mainnet-public.mirrornode.hedera.com";
const MIRROR = `${MIRROR_BASE}/api/v1`;

async function main() {
    const targetId = "0.0.10505801";
    
    console.log(`Deep investigation of ${targetId}...\n`);

    // 1. Full account info
    const accRes = await fetch(`${MIRROR}/accounts/${targetId}`);
    const accData = await accRes.json();
    console.log(`Account Info:`);
    console.log(`  EVM Address: ${accData.evm_address}`);
    console.log(`  Balance: ${(accData.balance?.balance || 0) / 1e8} HBAR`);
    console.log(`  Created: ${accData.created_timestamp}`);
    console.log(`  Memo: "${accData.memo}"`);
    console.log(`  Key Type: ${accData.key?.type}`);
    console.log(`  Key: ${accData.key?._type} ${accData.key?.key}`);
    console.log(`  Auto-Renew: ${accData.auto_renew_account_id}`);
    console.log(`  Receiver Sig Required: ${accData.receiver_sig_required}`);
    console.log(`  Max Auto Associations: ${accData.max_automatic_token_associations}`);

    // 2. Get ALL outgoing transactions to see where funds go AFTER they arrive
    console.log(`\nTracking where funds go AFTER arriving at target...`);
    const txRes = await fetch(`${MIRROR}/transactions?account.id=${targetId}&transactiontype=CRYPTOTRANSFER&order=asc&limit=100`);
    const txData = await txRes.json();
    
    // Find destinations this account sends TO
    const destinations = {};
    for (const tx of (txData.transactions || [])) {
        for (const t of tx.transfers) {
            if (t.account !== targetId && t.account !== "0.0.98" && t.account !== "0.0.800" && t.account !== "0.0.801" && t.account !== "0.0.802" && t.amount > 0) {
                destinations[t.account] = (destinations[t.account] || 0) + t.amount;
            }
        }
    }
    
    console.log(`\nTop destinations this account sends to:`);
    const sorted = Object.entries(destinations).sort((a,b) => b[1]-a[1]);
    for (const [acc, amount] of sorted.slice(0,10)) {
        console.log(`  ${acc}: ${(amount/1e8).toFixed(4)} HBAR`);
    }

    // 3. Check how old the account is — exchanges have very old accounts
    console.log(`\nAccount age analysis:`);
    const created = parseFloat(accData.created_timestamp || "0");
    if (created > 0) {
        const createdDate = new Date(created * 1000);
        console.log(`  Created: ${createdDate.toISOString()}`);
        const ageDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        console.log(`  Age: ${ageDays.toFixed(0)} days`);
    }

    // 4. Check volume — exchanges process massive volumes
    const txCountRes = await fetch(`${MIRROR}/transactions?account.id=${targetId}&limit=1&order=asc`);
    const txCountData = await txCountRes.json();
    console.log(`\nTransaction volume check:`);
    console.log(`  First TX: ${txCountData.transactions?.[0]?.consensus_timestamp}`);

    // 5. Check if this account holds any known tokens (exchanges hold many tokens)
    const tokenRes = await fetch(`${MIRROR}/accounts/${targetId}/tokens?limit=20`);
    const tokenData = await tokenRes.json();
    console.log(`\nToken holdings (${tokenData.tokens?.length || 0} tokens):`);
    for (const t of (tokenData.tokens || []).slice(0, 10)) {
        console.log(`  Token ${t.token_id}: Balance ${t.balance}`);
    }
}

main().catch(console.error);
