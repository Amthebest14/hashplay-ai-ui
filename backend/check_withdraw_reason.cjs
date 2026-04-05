const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkReason(hash) {
    try {
        const r = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/contracts/results/${hash}`);
        const data = await r.json();
        console.log(`Hash: ${hash}`);
        console.log(`Error Message: ${data.error_message}`);
        console.log(`Result: ${data.result}`);
        if (data.call_result) {
            console.log(`Call Result: ${data.call_result}`);
        }
    } catch (e) {
        console.error(e.message);
    }
}

checkReason('0x20b0c917f6bd516204fffbcd4f367146fe97d1ce9fbb3abab62780ab299c715a');
