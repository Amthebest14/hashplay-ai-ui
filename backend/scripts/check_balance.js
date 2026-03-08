const fetch = require('node-fetch');

async function main() {
    const addresses = [
        "0x789b9F3977508488FDDcCa5570a662080528",
        "0x2936b406578d01c30a662080528488fddcca5570"
    ];

    for (const addr of addresses) {
        const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${addr.toLowerCase()}`;
        console.log("Checking Account:", addr);
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            console.log("Found ID:", data.account);
            console.log("Balance:", data.balance.balance / 1e8, "HBAR");
            console.log("Tokens:", data.balance.tokens.length);
        } else {
            console.log("Not found or Error:", res.status);
        }
    }
}

main();
