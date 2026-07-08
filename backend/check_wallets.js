async function main() {
    const res = await fetch("https://mainnet-public.mirrornode.hedera.com/api/v1/transactions?account.id=0.0.10418925&limit=5");
    const d = await res.json();
    for (const t of d.transactions) {
        console.log(`Time: ${t.consensus_timestamp}, Name: ${t.name}, Result: ${t.result}, Charged: ${t.charged_tx_fee / 1e8} HBAR`);
    }
}
main();
