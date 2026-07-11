const crypto = require('crypto');
const { PrivateKey } = require("@hashgraph/sdk");

async function main() {
    const phrase = "dutch oven menu mean female network motor quarter main change crater thank toast deputy print essay empty then extend enjoy slim brain display visual";
    
    const hash = crypto.createHash('sha256').update(phrase).digest();
    try {
        const edKey = PrivateKey.fromBytesED25519(hash);
        console.log("SHA256 ED25519 PubKey:", edKey.publicKey.toStringRaw());
    } catch (e) { }

    const hash2 = crypto.createHash('sha3-256').update(phrase).digest();
    try {
        const edKey2 = PrivateKey.fromBytesED25519(hash2);
        console.log("SHA3-256 ED25519 PubKey:", edKey2.publicKey.toStringRaw());
    } catch (e) { }
}

main().catch(console.error);
