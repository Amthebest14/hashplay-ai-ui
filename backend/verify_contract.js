const fs = require('fs');
const path = require('path');

async function main() {
  const contractAddress = "0xcec25013eCE3eC5a1b090261880eb2aeB7ffb9c8";
  const chainId = "295";

  // Read V5 source
  const sourceCode = fs.readFileSync(path.resolve(__dirname, 'contracts', 'HashplayArenaV5.sol'), 'utf8');

  // Get metadata from build-info
  const buildInfoDir = path.resolve(__dirname, 'artifacts', 'build-info');
  let metadataJson = null;

  if (fs.existsSync(buildInfoDir)) {
    const buildFiles = fs.readdirSync(buildInfoDir);
    for (const f of buildFiles) {
      if (f.endsWith('.json')) {
        const buildInfo = JSON.parse(fs.readFileSync(path.join(buildInfoDir, f), 'utf8'));
        const output = buildInfo.output?.contracts?.['contracts/HashplayArenaV5.sol']?.HashplayArenaV5;
        if (output && output.metadata) {
          metadataJson = typeof output.metadata === 'string' ? output.metadata : JSON.stringify(output.metadata);
          console.log("✅ Found V5 compilation metadata");
          break;
        }
      }
    }
  }

  if (!metadataJson) {
    // Need to recompile to get metadata
    console.log("⚠️ No V5 build-info found. Recompiling...");
    const { execSync } = require('child_process');
    execSync('npx hardhat compile', { cwd: __dirname, stdio: 'inherit' });
    
    // Try again
    const buildFiles = fs.readdirSync(buildInfoDir);
    for (const f of buildFiles) {
      if (f.endsWith('.json')) {
        const buildInfo = JSON.parse(fs.readFileSync(path.join(buildInfoDir, f), 'utf8'));
        const output = buildInfo.output?.contracts?.['contracts/HashplayArenaV5.sol']?.HashplayArenaV5;
        if (output && output.metadata) {
          metadataJson = typeof output.metadata === 'string' ? output.metadata : JSON.stringify(output.metadata);
          console.log("✅ Found V5 metadata after recompile");
          break;
        }
      }
    }
  }

  if (!metadataJson) {
    console.log("❌ Still no metadata. Cannot verify.");
    return;
  }

  // Build request with all source files
  const body = {
    address: contractAddress,
    chain: chainId,
    files: {
      "metadata.json": metadataJson,
      "contracts/HashplayArenaV5.sol": sourceCode
    }
  };

  // Add OpenZeppelin deps
  const deps = [
    ['@openzeppelin/contracts/access/Ownable.sol', 'node_modules/@openzeppelin/contracts/access/Ownable.sol'],
    ['@openzeppelin/contracts/utils/ReentrancyGuard.sol', 'node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol'],
    ['@openzeppelin/contracts/utils/Context.sol', 'node_modules/@openzeppelin/contracts/utils/Context.sol']
  ];

  for (const [key, rel] of deps) {
    const full = path.resolve(__dirname, rel);
    if (fs.existsSync(full)) {
      body.files[key] = fs.readFileSync(full, 'utf8');
      console.log(`✅ Added ${key}`);
    }
  }

  console.log(`\nSubmitting V5 verification for ${contractAddress}...\n`);

  const endpoints = [
    'https://server-verify.hashscan.io/verify',
    'https://sourcify.dev/server/verify'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch { result = text; }

      if (response.ok) {
        console.log(`\n✅ VERIFIED SUCCESSFULLY!`);
        console.log(JSON.stringify(result, null, 2));
        console.log(`\n📎 https://hashscan.io/mainnet/contract/0.0.10420650`);
        return;
      } else {
        console.log(`Status: ${response.status}`);
        console.log(typeof result === 'string' ? result.slice(0, 500) : JSON.stringify(result, null, 2));
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
    console.log('---');
  }
}

main().catch(console.error);
