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

  console.log(`Fetching all logs for ${contractHederaId}...\n`);

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  let biggestWin = { net: 0 };
  let biggestLoss = { wager: 0 };
  let totalWins = 0;
  let totalLosses = 0;
  let logCount = 0;

  // Fetch ALL logs (no topic filter - filter client-side)
  let nextUrl = `${MIRROR}/contracts/${contractHederaId}/results/logs?limit=100&order=asc`;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    const data = await res.json();

    for (const log of (data.logs || [])) {
      if (!log.topics || log.topics[0] !== GAME_RESULT_TOPIC) continue;

      logCount++;
      try {
        const player = "0x" + log.topics[1].slice(26);

        const decoded = abiCoder.decode(
          ["uint8", "uint8", "uint256", "bool", "uint256", "uint256", "uint256"],
          log.data
        );

        const gameType = Number(decoded[0]);
        const prediction = Number(decoded[1]);
        const wager = Number(decoded[2]);
        const won = decoded[3];
        const payout = Number(decoded[4]);
        const points = Number(decoded[5]);
        const roll = Number(decoded[6]);

        const gameName = gameType === 1 ? "Dice" : "Coin Flip";
        const wagerHbar = wager / 1e8;
        const payoutHbar = payout / 1e8;
        const netWin = payoutHbar - wagerHbar;

        if (won) {
          totalWins++;
          if (netWin > biggestWin.net) {
            biggestWin = { net: netWin, wager: wagerHbar, payout: payoutHbar, player, roll, game: gameName };
          }
        } else {
          totalLosses++;
          if (wagerHbar > biggestLoss.wager) {
            biggestLoss = { wager: wagerHbar, player, roll, game: gameName };
          }
        }
      } catch {}
    }

    if (data.links && data.links.next) {
      nextUrl = `${MIRROR_BASE}${data.links.next}`;
    } else {
      nextUrl = null;
    }
  }

  const winRate = logCount > 0 ? ((totalWins / logCount) * 100).toFixed(1) : "0";

  console.log(`========================================`);
  console.log(`   HASHPLAY — WIN/LOSS ANALYSIS`);
  console.log(`========================================`);
  console.log(`Total Games Logged:  ${logCount}`);
  console.log(`Wins:                ${totalWins}`);
  console.log(`Losses:              ${totalLosses}`);
  console.log(`Actual Win Rate:     ${winRate}%`);
  console.log(`----------------------------------------`);
  console.log(`🏆 BIGGEST WIN:`);
  console.log(`   Player:   ${biggestWin.player || "N/A"}`);
  console.log(`   Game:     ${biggestWin.game || "N/A"}`);
  console.log(`   Wager:    ${biggestWin.wager || 0} HBAR`);
  console.log(`   Payout:   ${biggestWin.payout || 0} HBAR`);
  console.log(`   Net Gain: +${(biggestWin.net || 0).toFixed(2)} HBAR`);
  console.log(`   Roll:     ${biggestWin.roll || "N/A"}`);
  console.log(`----------------------------------------`);
  console.log(`💀 BIGGEST LOSS:`);
  console.log(`   Player:   ${biggestLoss.player || "N/A"}`);
  console.log(`   Game:     ${biggestLoss.game || "N/A"}`);
  console.log(`   Wager:    ${biggestLoss.wager || 0} HBAR`);
  console.log(`   Roll:     ${biggestLoss.roll || "N/A"}`);
  console.log(`========================================`);
}

main().catch(console.error);
