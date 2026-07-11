const fetch = require('node-fetch');

async function main() {
    const accountId = "0.0.10627830";
    const res = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${accountId}`);
    const json = await res.json();
    console.log("Account info:");
    console.log("Key:", json.key);
    console.log("EVM Address:", json.evm_address);
    console.log("Alias:", json.alias);
}

main().catch(console.error);
