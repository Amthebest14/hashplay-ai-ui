const fetch = require('node-fetch');

async function main() {
    const TREASURY_ID = "0.0.7810956";
    const V1_ID = "0.0.8103703";
    const V2_ID = "0.0.8119191";
    const TOKEN_ID = "0.0.8076828";

    console.log("--- DEFINITIVE STATUS REPORT ---");

    async function check(id, label) {
        const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${id}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            const hbar = data.balance.balance / 1e8;
            const token = data.balance.tokens.find(t => t.token_id === TOKEN_ID);
            const tokenBalance = token ? token.balance / 1e8 : 0;

            console.log(`${label} (${id}):`);
            console.log(`  HBAR: ${hbar}`);
            console.log(`  $HASH: ${tokenBalance} M`);
        } catch (e) {
            console.log(`${label} (${id}) Error: ${e.message}`);
        }
    }

    await check(TREASURY_ID, "TREASURY");
    await check(V1_ID, "V1_OLD_CONTRACT");
    await check(V2_ID, "V2_NEW_CONTRACT");

    console.log("--- REPORT END ---");
}

main();
