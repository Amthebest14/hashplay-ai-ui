const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkBalances() {
    const contracts = ['0.0.10418933', '0.0.10419246', '0.0.10419442'];
    for (const c of contracts) {
        try {
            const r = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/balances?account.id=${c}`);
            const data = await r.json();
            if (data.balances && data.balances.length > 0) {
                console.log(`${c} balance: ${data.balances[0].balance / 1e8} HBAR`);
            } else {
                console.log(`${c} balance: 0 HBAR`);
            }
        } catch (e) {
            console.error(`Error checking ${c}:`, e.message);
        }
    }
}

checkBalances();
