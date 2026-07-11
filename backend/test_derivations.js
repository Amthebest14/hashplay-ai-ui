const { Mnemonic } = require("@hashgraph/sdk");

async function main() {
    const phrase = "dutch oven menu mean female network motor quarter main change crater thank toast deputy print essay empty then extend enjoy slim brain display visual";
    const targetPubKey = "703740c0bda3e0758fc0d19a35af6a63793edb318e8c3b121d6d7f2a78edfc73";
    
    const mnemonic = await Mnemonic.fromString(phrase);
    console.log("Checking Legacy Derivations...");
    try {
        const legacyKey = await mnemonic.toLegacyPrivateKey();
        console.log("Legacy PubKey:", legacyKey.publicKey.toStringRaw());
        if (legacyKey.publicKey.toStringRaw() === targetPubKey) {
            console.log("🔥 MATCH FOUND: Legacy Private Key!");
            console.log(legacyKey.toString());
            return;
        }
    } catch (e) {}

    console.log("Checking Standard Derivations 0-20...");
    for (let i = 0; i <= 20; i++) {
        const edKey = await mnemonic.toStandardEd25519PrivateKey("", i);
        if (edKey.publicKey.toStringRaw() === targetPubKey) {
            console.log(`🔥 MATCH FOUND: Standard Ed25519 Index ${i}!`);
            console.log(edKey.toString());
            return;
        }
    }
    
    console.log("No match found for ED25519.");
}

main().catch(console.error);
