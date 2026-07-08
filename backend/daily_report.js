require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

const MIRROR_BASE = "https://mainnet-public.mirrornode.hedera.com";
const MIRROR = `${MIRROR_BASE}/api/v1`;

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
  const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

  // On-chain reads
  const abi = ["function totalGamesPlayed() view returns (uint256)"];
  const contract = new ethers.Contract(contractAddress, abi, provider);
  const [totalGames, balanceWei] = await Promise.all([
    contract.totalGamesPlayed(),
    provider.getBalance(contractAddress)
  ]);
  const tvl = ethers.formatEther(balanceWei);

  // Resolve Hedera ID
  const accRes = await fetch(`${MIRROR}/accounts/${contractAddress}`);
  const accData = await accRes.json();
  const contractHederaId = accData.account;

  const GAME_RESULT_TOPIC = "0x3ff1bbfe2ddc910863e4520f9b7ee9b9095d766c1bfa3a544c517bd44b5371e6";
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  console.log(`Fetching all logs for ${contractHederaId}...\n`);

  // Today = last 24 hours
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartSec = Math.floor(todayStart.getTime() / 1000);

  // Collect ALL games, separate today vs historical
  const allGames = [];
  const allPlayers = new Set();
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

        const timestamp = parseFloat(log.timestamp || "0");
        const gameType = Number(decoded[0]);
        const prediction = Number(decoded[1]);
        const wager = Number(decoded[2]) / 1e8;
        const won = decoded[3];
        const payout = Number(decoded[4]) / 1e8;
        const points = Number(decoded[5]);
        const roll = Number(decoded[6]);
        const gameName = gameType === 1 ? "Dice" : "Coin";
        const net = won ? (payout - wager) : -wager;

        allGames.push({ player, gameType, gameName, prediction, wager, won, payout, points, roll, net, timestamp });
        allPlayers.add(player);
      } catch {}
    }

    if (data.links && data.links.next) {
      nextUrl = `${MIRROR_BASE}${data.links.next}`;
    } else {
      nextUrl = null;
    }
  }

  // Split today vs before
  const todayGames = allGames.filter(g => g.timestamp >= todayStartSec);
  const beforeGames = allGames.filter(g => g.timestamp < todayStartSec);
  const beforePlayers = new Set(beforeGames.map(g => g.player));
  const todayPlayers = new Set(todayGames.map(g => g.player));
  const newPlayers = [...todayPlayers].filter(p => !beforePlayers.has(p));

  // Today stats
  const todayWins = todayGames.filter(g => g.won);
  const todayLosses = todayGames.filter(g => !g.won);
  const todayVolume = todayGames.reduce((s, g) => s + g.wager, 0);
  const todayPayouts = todayWins.reduce((s, g) => s + g.payout, 0);
  const todayWinRate = todayGames.length > 0 ? ((todayWins.length / todayGames.length) * 100).toFixed(1) : "0";

  // Sort by net gain/loss
  const sortedByNet = [...todayGames].sort((a, b) => b.net - a.net);
  const topWins = sortedByNet.filter(g => g.won).slice(0, 5);
  const topLosses = sortedByNet.filter(g => !g.won).sort((a, b) => a.net - b.net).slice(0, 5);

  // Close calls: coin flip wins where roll was 28-30 (barely won heads) or 71-73 (barely won tails)
  // Dice close wins: winRoll was close to 30 threshold — we can't see winRoll, so use biggest dice payouts
  const closeCalls = todayGames.filter(g => {
    if (g.gameName === "Coin") {
      return (g.won && (g.roll >= 28 && g.roll <= 30)) || (g.won && (g.roll >= 71 && g.roll <= 73)) ||
             (!g.won && (g.roll >= 27 && g.roll <= 31)) || (!g.won && (g.roll >= 69 && g.roll <= 73));
    }
    return false;
  });

  // Per-player today summary
  const playerStats = {};
  for (const g of todayGames) {
    if (!playerStats[g.player]) playerStats[g.player] = { wins: 0, losses: 0, wagered: 0, net: 0 };
    playerStats[g.player].wins += g.won ? 1 : 0;
    playerStats[g.player].losses += g.won ? 0 : 1;
    playerStats[g.player].wagered += g.wager;
    playerStats[g.player].net += g.net;
  }

  // Resolve player addresses to Hedera IDs
  async function resolvePlayer(addr) {
    try {
      const r = await fetch(`${MIRROR}/accounts/${addr}`);
      if (r.ok) { const d = await r.json(); return d.account || addr; }
    } catch {}
    return addr.slice(0, 8) + "..." + addr.slice(-4);
  }

  // Print report
  console.log(`╔══════════════════════════════════════════════╗`);
  console.log(`║     HASHPLAY DAILY REPORT — ${now.toISOString().split('T')[0]}     ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  TVL (Balance):     ${tvl} HBAR`);
  console.log(`║  Total Games (all): ${totalGames.toString()}`);
  console.log(`║  All-Time Players:  ${allPlayers.size}`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  TODAY'S ACTIVITY`);
  console.log(`║  Games Played:      ${todayGames.length}`);
  console.log(`║  Unique Players:    ${todayPlayers.size}`);
  console.log(`║  New Players:       ${newPlayers.length}`);
  console.log(`║  Volume Wagered:    ${todayVolume.toFixed(2)} HBAR`);
  console.log(`║  Payouts:           ${todayPayouts.toFixed(2)} HBAR`);
  console.log(`║  House Take:        ${(todayVolume - todayPayouts).toFixed(2)} HBAR`);
  console.log(`║  Win Rate:          ${todayWinRate}% (${todayWins.length}W / ${todayLosses.length}L)`);
  console.log(`╠══════════════════════════════════════════════╣`);

  if (topWins.length > 0) {
    console.log(`║  🏆 TOP WINS TODAY`);
    for (const g of topWins) {
      const pid = await resolvePlayer(g.player);
      console.log(`║    ${pid} | ${g.gameName} | Bet ${g.wager} → Won ${g.payout} HBAR (+${g.net.toFixed(2)}) | Roll: ${g.roll}`);
    }
    console.log(`╠══════════════════════════════════════════════╣`);
  }

  if (topLosses.length > 0) {
    console.log(`║  💀 BIGGEST LOSSES TODAY`);
    for (const g of topLosses) {
      const pid = await resolvePlayer(g.player);
      console.log(`║    ${pid} | ${g.gameName} | Lost ${g.wager} HBAR | Roll: ${g.roll}`);
    }
    console.log(`╠══════════════════════════════════════════════╣`);
  }

  if (closeCalls.length > 0) {
    console.log(`║  😬 CLOSE CALLS (Coin rolls near the edge)`);
    for (const g of closeCalls.slice(0, 5)) {
      const pid = await resolvePlayer(g.player);
      const result = g.won ? "WON ✅" : "LOST ❌";
      console.log(`║    ${pid} | Roll: ${g.roll} | Bet ${g.wager} HBAR | ${result}`);
    }
    console.log(`╠══════════════════════════════════════════════╣`);
  }

  if (newPlayers.length > 0) {
    console.log(`║  🆕 NEW PLAYERS TODAY`);
    for (const p of newPlayers) {
      const pid = await resolvePlayer(p);
      const s = playerStats[p];
      console.log(`║    ${pid} | ${s.wins}W/${s.losses}L | Wagered: ${s.wagered.toFixed(0)} | Net: ${s.net >= 0 ? '+' : ''}${s.net.toFixed(2)} HBAR`);
    }
    console.log(`╠══════════════════════════════════════════════╣`);
  }

  // Top players today by volume
  const sortedPlayers = Object.entries(playerStats).sort((a, b) => b[1].wagered - a[1].wagered);
  if (sortedPlayers.length > 0) {
    console.log(`║  👑 MOST ACTIVE PLAYERS TODAY`);
    for (const [addr, s] of sortedPlayers.slice(0, 5)) {
      const pid = await resolvePlayer(addr);
      console.log(`║    ${pid} | ${s.wins}W/${s.losses}L | Vol: ${s.wagered.toFixed(0)} HBAR | Net: ${s.net >= 0 ? '+' : ''}${s.net.toFixed(2)} HBAR`);
    }
  }

  console.log(`╚══════════════════════════════════════════════╝`);
}

main().catch(console.error);
