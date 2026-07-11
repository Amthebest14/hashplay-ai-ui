const { PrivateKey } = require("@hashgraph/sdk");
const { ethers } = require("ethers");

async function main() {
    const phrase = "dutch oven menu mean female network motor quarter main change crater thank toast deputy print essay empty then extend enjoy slim brain display visual";
    const wallet = ethers.Wallet.fromPhrase(phrase);
    console.log("Ethers PK:", wallet.privateKey);
    
    const pkBytes = Buffer.from(wallet.privateKey.substring(2), "hex");
    
    // Treat the ECDSA private key as raw bytes for ED25519
    try {
        const edKey = PrivateKey.fromBytesED25519(pkBytes);
        console.log("Derived ED25519 PubKey:", edKey.publicKey.toStringRaw());
    } catch (e) {
        console.error("fromBytesED25519 failed", e);
    }
}

main().catch(console.error);
