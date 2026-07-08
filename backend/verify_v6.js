const fs = require('fs');

async function verify() {
    console.log("Verifying ArenaV6 via Sourcify v2 API...");

    // 1. Gather files
    const source = fs.readFileSync('contracts/HashplayArenaV6.sol', 'utf8');
    const playTokenSource = fs.readFileSync('contracts/PlayToken.sol', 'utf8');
    const IERC20 = fs.readFileSync('node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol', 'utf8');
    const SafeERC20 = fs.readFileSync('node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol', 'utf8');
    const Address = fs.readFileSync('node_modules/@openzeppelin/contracts/utils/Address.sol', 'utf8');
    const IERC20Permit = fs.readFileSync('node_modules/@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol', 'utf8');
    const ReentrancyGuard = fs.readFileSync('node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol', 'utf8');
    const Ownable = fs.readFileSync('node_modules/@openzeppelin/contracts/access/Ownable.sol', 'utf8');
    const Context = fs.readFileSync('node_modules/@openzeppelin/contracts/utils/Context.sol', 'utf8');

    const metadataPath = 'artifacts/build-info/';
    const buildFiles = fs.readdirSync(metadataPath);
    const buildInfo = JSON.parse(fs.readFileSync(metadataPath + buildFiles[0], 'utf8'));

    // Extract metadata JSON from build info
    const metadataStr = buildInfo.output.contracts['contracts/HashplayArenaV6.sol']['HashplayArenaV6'].metadata;
    const metadata = JSON.parse(metadataStr);

    const body = {
        address: "0xf3bE968617F4958390946aEF09EFCbD0E0f20c13",
        chain: "295", // Hedera Mainnet
        files: {
            "metadata.json": JSON.stringify(metadata),
            "contracts/HashplayArenaV6.sol": source,
            "contracts/PlayToken.sol": playTokenSource,
            "@openzeppelin/contracts/token/ERC20/IERC20.sol": IERC20,
            "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol": SafeERC20,
            "@openzeppelin/contracts/utils/Address.sol": Address,
            "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol": IERC20Permit,
            "@openzeppelin/contracts/security/ReentrancyGuard.sol": ReentrancyGuard,
            "@openzeppelin/contracts/access/Ownable.sol": Ownable,
            "@openzeppelin/contracts/utils/Context.sol": Context
        }
    };

    const res = await fetch("https://sourcify.dev/server/v2/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log(data);
}

verify().catch(console.error);
