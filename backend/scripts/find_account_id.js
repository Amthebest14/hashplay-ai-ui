const { PrivateKey, Client } = require("@hashgraph/sdk");

async function main() {
    const keyStr = "0xe2668a034746f62381eccd4fb7d0f35ecc9c00100b62061a6f9673b4513a7f15";
    const privateKey = PrivateKey.fromStringECDSA(keyStr);
    const publicKey = privateKey.publicKey;
    const evmAddress = publicKey.toEvmAddress();

    console.log("Public Key:", publicKey.toStringRaw());
    console.log("EVM Address:", evmAddress);
}

main();
