const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkIds() {
    const ids = ['0.0.10420289', '0.0.10420291'];
    for (const id of ids) {
        try {
            const r = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/accounts/${id}`);
            const data = await r.json();
            console.log(`${id} -> EVM: ${data.evm_address}`);
        } catch (e) {
            console.error(e.message);
        }
    }
}

checkIds();
