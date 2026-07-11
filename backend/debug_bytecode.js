const { ethers } = require("ethers");

async function main() {
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const playAddress = "0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
    
    const code = await provider.getCode(playAddress);
    
    // Check strings in code
    const hexToString = (hex) => {
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
            const char = parseInt(hex.substr(i, 2), 16);
            if (char >= 32 && char <= 126) str += String.fromCharCode(char);
        }
        return str;
    };
    
    console.log(hexToString(code.replace('0x', '')));
}

main().catch(console.error);
