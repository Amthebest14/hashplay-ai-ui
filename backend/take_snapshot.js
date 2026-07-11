const fs = require('fs');
const fetch = require('node-fetch');

async function main() {
    const tokenId = "0.0.8076828";
    let balances = [];
    let nextLink = `/api/v1/tokens/${tokenId}/balances?limit=100`;

    console.log("Fetching snapshot of all PLAY holders...");
    while (nextLink) {
        const res = await fetch(`https://mainnet-public.mirrornode.hedera.com${nextLink}`);
        const data = await res.json();
        balances = balances.concat(data.balances);
        nextLink = data.links?.next;
    }

    console.log(`Found ${balances.length} holders.`);
    fs.writeFileSync('play_snapshot.json', JSON.stringify(balances, null, 2));
    console.log("Saved to play_snapshot.json");
}

main().catch(console.error);
