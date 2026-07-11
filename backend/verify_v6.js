const fs = require('fs');

async function verify() {
    console.log("Verifying HashplayArenaV6 via Sourcify v2 API...");

    const CHAIN_ID = "295"; // Hedera Mainnet
    const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000a2306e";
    const BUILD_FILE = 'artifacts/build-info/d7e2967b2e5ac7fcaf87671f31c3c082.json';

    const buildInfo = JSON.parse(fs.readFileSync(BUILD_FILE, 'utf8'));

    // Use the Standard JSON input directly — this is what Sourcify v2 expects
    const standardJsonInput = {
        language: buildInfo.input.language,
        sources: buildInfo.input.sources,
        settings: buildInfo.input.settings
    };

    const body = {
        compilerVersion: buildInfo.solcLongVersion,
        contractIdentifier: "contracts/HashplayArenaV6.sol:HashplayArenaV6",
        stdJsonInput: standardJsonInput
    };

    console.log("Compiler version:", buildInfo.solcLongVersion);
    console.log(`Submitting to: POST /v2/verify/${CHAIN_ID}/${CONTRACT_ADDRESS}`);

    const res = await fetch(`https://sourcify.dev/server/v2/verify/${CHAIN_ID}/${CONTRACT_ADDRESS}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const text = await res.text();
    console.log("Status:", res.status);
    try {
        const json = JSON.parse(text);
        console.log(JSON.stringify(json, null, 2));

        // If we got a verificationId, poll for the result
        if (json.verificationId) {
            console.log("\nPolling for verification result...");
            await new Promise(r => setTimeout(r, 5000));
            const poll = await fetch(`https://sourcify.dev/server/v2/verify/${json.verificationId}`);
            const pollData = await poll.json();
            console.log(JSON.stringify(pollData, null, 2));
        }
    } catch {
        console.log(text);
    }
}

verify().catch(console.error);
