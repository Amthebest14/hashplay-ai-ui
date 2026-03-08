const fetch = require('node-fetch');

async function main() {
    const address = "0x789b9F3977508488FDDcCa5570a662080528".toLowerCase();
    const url = `https://testnet.mirrornode.hedera.com/api/v1/contracts/${address}`;

    console.log("Fetching from:", url);
    const res = await fetch(url);
    if (!res.ok) {
        console.log("Error:", res.status, res.statusText);
        const text = await res.text();
        console.log("Body:", text);
        return;
    }
    const data = await res.json();
    console.log("Contract ID:", data.contract_id);
}

main();
