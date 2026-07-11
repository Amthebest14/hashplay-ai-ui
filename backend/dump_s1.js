const axios = require('axios');
const fs = require('fs');

async function fetchS1() {
    let hasNext = true;
    let url = 'https://mainnet-public.mirrornode.hedera.com/api/v1/contracts/0.0.10420650/results/logs?order=asc';
    const players = new Map();

    console.log("Fetching V5 (Season 1) logs...");
    while(hasNext) {
        const res = await axios.get(url);
        for(let log of res.data.logs) {
            // PlayerRewarded(address,uint256)
            if(log.topics[0] === '0x992fb257224f8eeef24bd6b51c11d511daeb094ec62b08a654c60205bda39a3f') {
                const p = '0x' + log.topics[1].slice(-40);
                const xp = parseInt(log.data.slice(0, 66), 16);
                if(!players.has(p)) players.set(p, 0);
                players.set(p, players.get(p) + xp);
            }
        }
        if(res.data.links.next) {
            url = 'https://mainnet-public.mirrornode.hedera.com' + res.data.links.next;
        } else {
            hasNext = false;
        }
    }

    const arr = Array.from(players.entries()).map(([a, x]) => ({address: a, xp: x})).sort((a,b)=>b.xp - a.xp);
    fs.mkdirSync('../src/data', {recursive: true});
    fs.writeFileSync('../src/data/season1.json', JSON.stringify(arr, null, 2));
    console.log('Saved ' + arr.length + ' players to season1.json');
}

fetchS1().catch(console.error);
