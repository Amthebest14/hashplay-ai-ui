const fetch = require('node-fetch');

async function main() {
    const url = "https://sourcify.dev/server/files/any/295/0x204D71684c5F33ACbEc3182EE07B875910a0E1c8";
    try {
        const res = await fetch(url);
        const data = await res.json();
        const files = data.files;
        const playTokenFile = files.find(f => f.name.includes("PlayToken.sol"));
        if (playTokenFile) {
            console.log(playTokenFile.content);
        } else {
            console.log("PlayToken.sol not found in Sourcify response");
            console.log("Available files:", files.map(f => f.name));
        }
    } catch (e) {
        console.log("Error:", e);
    }
}

main().catch(console.error);
