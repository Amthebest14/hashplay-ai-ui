const crypto = require('crypto');
const { PrivateKey } = require("@hashgraph/sdk");
const { ethers } = require("ethers");

async function main() {
    const phrase = "dutch oven menu mean female network motor quarter main change crater thank toast deputy print essay empty then extend enjoy slim brain display visual";
    const wallet = ethers.Wallet.fromPhrase(phrase);
    const pkBytes = Buffer.from(wallet.privateKey.substring(2), "hex");
    
    // Test 1: Hash the raw bytes
    const hash1 = crypto.createHash('sha256').update(pkBytes).digest();
    try {
        const edKey = PrivateKey.fromBytesED25519(hash1);
        console.log("Hash(PK Bytes) PubKey:", edKey.publicKey.toStringRaw());
    } catch (e) {}

    // Test 2: Hash the hex string (with 0x)
    const hash2 = crypto.createHash('sha256').update(wallet.privateKey).digest();
    try {
        const edKey = PrivateKey.fromBytesED25519(hash2);
        console.log("Hash(PK Hex 0x) PubKey:", edKey.publicKey.toStringRaw());
    } catch (e) {}

    // Test 3: Hash the hex string (without 0x)
    const hash3 = crypto.createHash('sha256').update(wallet.privateKey.substring(2)).digest();
    try {
        const edKey = PrivateKey.fromBytesED25519(hash3);
        console.log("Hash(PK Hex) PubKey:", edKey.publicKey.toStringRaw());
    } catch (e) {}
}

main().catch(console.error);
