const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// ─── CONFIG ────────────────────────────────────────────────────────────────
const DESTINATION_EVM = "0x000000000000000000000000000000000072F6FE"; // 0.0.7534334 ✓
const NUM_ACCOUNTS    = 40;
const RPC_URL         = "https://mainnet.hashio.io/api";
const GAS_LIMIT       = 21000n;
const GAS_BUFFER_HBAR = ethers.parseEther("0.05"); // actual gas cost is ~0.00002 HBAR
const MIN_BALANCE     = ethers.parseEther("0.06");  // skip wallets below 0.06 HBAR
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Read seed phrase from local file
  const seedPath = path.resolve(__dirname, "seed.txt");
  if (!fs.existsSync(seedPath)) {
    console.error("❌ seed.txt not found. Create it and paste your 12-word seed phrase.");
    return;
  }

  const mnemonic = fs.readFileSync(seedPath, "utf8").trim();

  // Basic validation
  const words = mnemonic.split(/\s+/);
  if (words.length !== 12 && words.length !== 24) {
    console.error(`❌ Invalid seed phrase. Expected 12 or 24 words, got ${words.length}.`);
    return;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║       HASHPLAY — WALLET SWEEP TOOL           ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  Accounts:     ${NUM_ACCOUNTS}`);
  console.log(`║  Destination:  0.0.7534334`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  let totalSwept = 0n;
  let sweptCount = 0;

  for (let i = 0; i < NUM_ACCOUNTS; i++) {
    // MetaMask derivation path: m/44'/60'/0'/0/i
    const derivPath = `m/44'/60'/0'/0/${i}`;
    const hdWallet  = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase(mnemonic),
      derivPath
    );
    const wallet  = hdWallet.connect(provider);
    const address = wallet.address;

    let balance;
    try {
      balance = await provider.getBalance(address);
    } catch (e) {
      console.log(`  Account ${i + 1} (${address}): ⚠️  RPC error, skipping`);
      continue;
    }

    const hbar = parseFloat(ethers.formatEther(balance)).toFixed(4);

    if (balance === 0n) {
      console.log(`  Account ${String(i + 1).padStart(2, "0")} | ${address} | 0 HBAR — skip`);
      continue;
    }

    if (balance < MIN_BALANCE) {
      console.log(`  Account ${String(i + 1).padStart(2, "0")} | ${address} | ${hbar} HBAR — too low, skip`);
      continue;
    }

    // Leave 0.5 HBAR as buffer for gas, send the rest
    const sendAmount = balance - GAS_BUFFER_HBAR;

    console.log(`  Account ${String(i + 1).padStart(2, "0")} | ${address} | ${hbar} HBAR → sweeping...`);

    try {
      const feeData = await provider.getFeeData();
      const tx = await wallet.sendTransaction({
        to:       DESTINATION_EVM,
        value:    sendAmount,
        gasLimit: GAS_LIMIT,
        maxFeePerGas:         feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });
      await tx.wait();
      totalSwept += sendAmount;
      sweptCount++;
      console.log(`             ✅ Swept ${ethers.formatEther(sendAmount)} HBAR | Tx: ${tx.hash}`);
    } catch (e) {
      console.log(`             ❌ Failed: ${e.message.split('(')[0].trim()}`);
    }
  }

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║  SWEEP COMPLETE`);
  console.log(`║  Wallets swept:  ${sweptCount}`);
  console.log(`║  Total HBAR:     ${parseFloat(ethers.formatEther(totalSwept)).toFixed(4)} HBAR`);
  console.log(`╚══════════════════════════════════════════════╝`);
}

main().catch(console.error);
