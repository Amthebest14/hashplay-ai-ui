const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkReason(hash) {
    try {
        const r = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/contracts/results/${hash}`);
        const data = await r.json();
        console.log(`Hash: ${hash}`);
        console.log(`Error Message (Hex): ${data.error_message}`);
        
        if (data.error_message && data.error_message.startsWith('0x08c379a0')) {
            const hex = data.error_message.slice(10+64);
            const text = Buffer.from(hex, 'hex').toString('utf8').replace(/\u0000/g, '');
            console.log(`Decoded Reason: ${text}`);
        }
        
        console.log(`Result: ${data.result}`);
    } catch (e) {
        console.error(e.message);
    }
}

// Check the LATEST V5 failure hash
checkReason('0x7cfdb847cd0d01f5c9efef36ce421342b64411a5479d62de3bb0813767f33760');
