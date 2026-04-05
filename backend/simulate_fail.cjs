require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

async function main() {
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const contractAddress = "0xcec25013eCE3eC5a1b090261880eb2aeB7ffb9c8";
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    console.log("--- Simulating play(2, 1) to V5.1 Fallback ---");
    
    // Exact payload data from user's error: 0xe802c36f...
    // 0xe802c36f (play(uint8,uint8))
    // 000...02 (gameType)
    // 000...01 (prediction)
    const data = "0xe802c36f00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001";
    
    try {
        const result = await provider.call({
            from: wallet.address,
            to: contractAddress,
            data: data,
            value: ethers.parseUnits("1", 18), // 1 HBAR
            gasLimit: 3000000,
            gasPrice: ethers.parseUnits("1500", "gwei")
        });
        
        console.log("Call result (hex):", result);
        if (result === "0x") {
            console.log("Empty result. This usually means a revert occurred without a reason string or it's a raw success.");
        }
    } catch (error) {
        console.log("Simulation caught error!");
        if (error.data) {
            console.log("RAW Error Data:", error.data);
            try {
                const decoded = ethers.toUtf8String('0x' + error.data.slice(138));
                console.log("Decoded Reason (likely):", decoded);
            } catch (e) {
                // Try decoding as Error(string)
                try {
                    const iface = new ethers.Interface(["error Error(string)"]);
                    const decoded = iface.decodeErrorData("Error", error.data);
                    console.log("Decoded Reason (Error string):", decoded);
                } catch(e2) {
                    console.log("Could not decode reason string.");
                }
            }
        } else {
            console.log("Error object:", error.message);
        }
    }
}

main().catch(console.error);
