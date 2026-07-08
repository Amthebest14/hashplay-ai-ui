require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

const MIRROR_BASE = "https://mainnet-public.mirrornode.hedera.com";
const MIRROR = `${MIRROR_BASE}/api/v1`;

async function main() {
  const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;
  const accRes = await fetch(`${MIRROR}/accounts/${contractAddress}`);
  const accData = await accRes.json();
  const contractHederaId = accData.account;

  const GAME_RESULT_TOPIC = "0x3ff1bbfe2ddc910863e4520f9b7ee9b9095d766c1bfa3a544c517bd44b5371e6";
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  console.log(`Reconstructing balance history for ${contractHederaId}...\n`);

  // Fetch all transactions to reconstruct balance over time
  let balance = 0; // tinybars
  let minBalance = Infinity;
  let minBalanceTime = "";
  let minBalanceGame = 0;
  let drainEvents = []; // times balance went below 10 HBAR
  let gameNum = 0;

  // Get ALL logs in order
  let allGames = [];
  let nextUrl = `${MIRROR}/contracts/${contractHederaId}/results/logs?limit=100&order=asc`;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    const data = await res.json();

    for (const log of (data.logs || [])) {
      if (!log.topics || log.topics[0] !== GAME_RESULT_TOPIC) continue;

      try {
        const player = "0x" + log.topics[1].slice(26);
        const decoded = abiCoder.decode(
          ["uint8", "uint8", "uint256", "bool", "uint256", "uint256", "uint256"],
          log.data
        );

        const wager = Number(decoded[2]); // tinybars
        const won = decoded[3];
        const payout = Number(decoded[4]); // tinybars
        const timestamp = log.timestamp || "0";

        allGames.push({ player, wager, won, payout, timestamp });
      } catch {}
    }

    if (data.links && data.links.next) {
      nextUrl = `${MIRROR_BASE}${data.links.next}`;
    } else {
      nextUrl = null;
    }
  }

  // Also get non-game transactions (funding, withdrawals) from transfer history
  let allTransfers = [];
  let nextTxUrl = `${MIRROR}/transactions?account.id=${contractHederaId}&limit=100&order=asc`;

  while (nextTxUrl) {
    const res = await fetch(nextTxUrl);
    const data = await res.json();

    for (const tx of (data.transactions || [])) {
      if (tx.result !== "SUCCESS") continue;
      
      for (const transfer of (tx.transfers || [])) {
        if (transfer.account === contractHederaId) {
          allTransfers.push({
            amount: Number(transfer.amount), // positive = in, negative = out
            timestamp: tx.consensus_timestamp || "0"
          });
        }
      }
    }

    if (data.links && data.links.next) {
      nextTxUrl = `${MIRROR_BASE}${data.links.next}`;
    } else {
      nextTxUrl = null;
    }
  }

  // Sort all transfers by timestamp and replay
  allTransfers.sort((a, b) => parseFloat(a.timestamp) - parseFloat(b.timestamp));

  let runningBalance = 0;
  let criticalMoments = [];

  for (const t of allTransfers) {
    runningBalance += t.amount;
    const balHbar = runningBalance / 1e8;
    const time = new Date(parseFloat(t.timestamp) * 1000).toISOString();

    if (balHbar < minBalance) {
      minBalance = balHbar;
      minBalanceTime = time;
    }

    if (balHbar < 10) {
      criticalMoments.push({ balance: balHbar, time, amount: t.amount / 1e8 });
    }
  }

  // Check the 500 bet specifically
  console.log(`========================================`);
  console.log(`   BALANCE HISTORY ANALYSIS`);
  console.log(`========================================`);
  console.log(`Total transfers tracked: ${allTransfers.length}`);
  console.log(`Total games tracked:     ${allGames.length}`);
  console.log(`Current balance:         ${(runningBalance / 1e8).toFixed(2)} HBAR`);
  console.log(`----------------------------------------`);
  console.log(`📉 LOWEST BALANCE EVER:`);
  console.log(`   ${minBalance.toFixed(2)} HBAR`);
  console.log(`   At: ${minBalanceTime}`);
  console.log(`----------------------------------------`);

  if (criticalMoments.length > 0) {
    console.log(`⚠️  CRITICAL MOMENTS (balance < 10 HBAR):`);
    for (const m of criticalMoments) {
      console.log(`   ${m.time} | Balance: ${m.balance.toFixed(2)} HBAR | Transfer: ${m.amount >= 0 ? '+' : ''}${m.amount.toFixed(2)} HBAR`);
    }
    console.log(`----------------------------------------`);
  } else {
    console.log(`✅ Contract never dropped below 10 HBAR`);
    console.log(`----------------------------------------`);
  }

  // Check for capped payouts (payout < expected)
  console.log(`\n🔍 CAPPED PAYOUTS (contract couldn't cover full payout):`);
  let foundCapped = false;
  for (const g of allGames) {
    if (g.won) {
      const expectedMin = g.wager * 2; // minimum expected payout (2x)
      if (g.payout < expectedMin && g.payout > 0) {
        foundCapped = true;
        const time = new Date(parseFloat(g.timestamp) * 1000).toISOString();
        const playerShort = g.player.slice(0, 8) + "..." + g.player.slice(-4);
        console.log(`   ${time}`);
        console.log(`   Player: ${playerShort} | Wager: ${(g.wager/1e8).toFixed(0)} HBAR`);
        console.log(`   Expected: ${(expectedMin/1e8).toFixed(0)} HBAR | Got: ${(g.payout/1e8).toFixed(2)} HBAR`);
        console.log(`   Shortfall: ${((expectedMin - g.payout)/1e8).toFixed(2)} HBAR`);
        console.log(`   ---`);
      }
    }
  }
  if (!foundCapped) console.log(`   None found — all payouts were fully covered ✅`);

  console.log(`========================================`);
}

main().catch(console.error);
