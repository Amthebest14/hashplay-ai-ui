const fetch = require('node-fetch');

async function main() {
    const evm = "0x20550f6024be718b03dc458f83ae5c0d7e79f01e";
    const res = await fetch(`https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${evm}`);
    const json = await res.json();
    console.log("Account info:", json);
}

main().catch(console.error);
