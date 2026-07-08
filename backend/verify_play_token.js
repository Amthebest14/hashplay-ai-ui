const fs   = require("fs");
const path = require("path");

const CONTRACT_ADDRESS = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
const CHAIN_ID         = "295";
const CREATION_TX      = "0x6ba35c8c59545750616e5ba5480971371498b298d1bb9d449e7466e9245aba62";

async function checkStatus(verificationId) {
    const res  = await fetch(`https://sourcify.dev/server/v2/verify/${verificationId}`);
    const data = await res.json();
    return data;
}

async function main() {
    // Load build-info (Standard JSON format hardhat already generates)
    const buildInfoDir = path.resolve(__dirname, "artifacts/build-info");
    const buildFiles   = fs.readdirSync(buildInfoDir).filter(f => f.endsWith(".json"));
    const latestBuild  = buildFiles.reduce((a, b) =>
        fs.statSync(path.join(buildInfoDir, a)).mtimeMs > fs.statSync(path.join(buildInfoDir, b)).mtimeMs ? a : b
    );
    const buildInfo = JSON.parse(fs.readFileSync(path.join(buildInfoDir, latestBuild), "utf8"));

    // stdJsonInput is exactly buildInfo.input (solc standard JSON)
    const stdJsonInput = buildInfo.input;
    const compilerVersion = `v${buildInfo.solcLongVersion}`;

    const payload = {
        stdJsonInput,
        compilerVersion,
        contractIdentifier: "contracts/PlayToken.sol:PlayToken",
        creationTransactionHash: CREATION_TX
    };

    const endpoint = `https://sourcify.dev/server/v2/verify/${CHAIN_ID}/${CONTRACT_ADDRESS}`;
    console.log(`Submitting to: ${endpoint}`);
    console.log(`Compiler: ${compilerVersion}`);
    console.log(`Sources: ${Object.keys(stdJsonInput.sources).join(", ")}\n`);

    const res  = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload)
    });

    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text.substring(0, 800)}`);

    let data;
    try { data = JSON.parse(text); } catch(e) { return; }

    if (data.verificationId) {
        console.log(`\nVerification job submitted! ID: ${data.verificationId}`);
        console.log("Polling for result...");

        // Poll until complete
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const status = await checkStatus(data.verificationId);
            console.log(`  [${i+1}] Status: ${JSON.stringify(status).substring(0, 200)}`);
            if (status.status === "verified" || status.status === "perfect" || status.status === "partial") {
                console.log(`\n✅ Contract verified! Match: ${status.status}`);
                console.log(`   HashScan: https://hashscan.io/mainnet/contract/0.0.10628895`);
                return;
            }
            if (status.status === "error" || status.error) {
                console.log("\n❌ Verification error:", status.error || status.status);
                return;
            }
        }
        console.log("Timed out waiting for verification result.");
    }
}

main().catch(console.error);
