require("dotenv").config({ path: "../.env" });
const { PrivateKey, Client } = require("@hashgraph/sdk");

async function main() {
    const keyStr = process.env.TESTNET_OPERATOR_KEY;
    const privateKey = PrivateKey.fromStringECDSA(keyStr);
    const publicKey = privateKey.publicKey;
    const evmAddress = publicKey.toEvmAddress();

    console.log("Public Key:", publicKey.toStringRaw());
    console.log("EVM Address:", evmAddress);
}

main();
