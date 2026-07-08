require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

const MIRROR_BASE = "https://mainnet-public.mirrornode.hedera.com";
const MIRROR = `${MIRROR_BASE}/api/v1`;

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
  const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

  // On-chain reads
  const abi = [
    "function totalGamesPlayed() view returns (uint256)",
    "function treasuryWallet() view returns (address)",
    "function getPlayerCount() view returns (uint256)",
    "function playerIndex(uint256) view returns (address)",
    "function playerXP(address) view returns (uint256)"
  ];
  const contract = new ethers.Contract(contractAddress, abi, provider);

  const [totalGames, treasuryAddr, contractBalWei] = await Promise.all([
    contract.totalGamesPlayed(),
    contract.treasuryWallet(),
    provider.getBalance(contractAddress)
  ]);
  const contractBal = ethers.formatEther(contractBalWei);
  const treasuryBalWei = await provider.getBalance(treasuryAddr);
  const treasuryBal = ethers.formatEther(treasuryBalWei);

  // Check leaderboard player count
  let playerCount = 0;
  try {
    const countBig = await contract.getPlayerCount();
    playerCount = Number(countBig);
  } catch (e) {
    console.log("Note: getPlayerCount() not available on this contract version");
  }

  // Resolve IDs
  const accRes = await fetch(`${MIRROR}/accounts/${contractAddress}`);
  const accData = await accRes.json();
  const contractHederaId = accData.account;
  const tresRes = await fetch(`${MIRROR}/accounts/${treasuryAddr}`);
  const tresData = await tresRes.json();
  const treasuryHederaId = tresData.account;

  // Count unique users from contract results
  const users = new Set();
  let nextUrl = `${MIRROR}/contracts/${contractHederaId}/results?limit=100&order=asc`;
  while (nextUrl) {
    const res = await fetch(nextUrl);
    const data = await res.json();
    for (const r of (data.results || [])) if (r.from) users.add(r.from.toLowerCase());
    nextUrl = (data.links && data.links.next) ? `${MIRROR_BASE}${data.links.next}` : null;
  }

  // Get all game logs for daily breakdown
  const GAME_RESULT_TOPIC = "0x3ff1bbfe2ddc910863e4520f9b7ee9b9095d766c1bfa3a544c517bd44b5371e6";
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const allGames = [];

  let nextLog = `${MIRROR}/contracts/${contractHederaId}/results/logs?limit=100&order=asc`;
  while (nextLog) {
    const res = await fetch(nextLog);
    const data = await res.json();
    for (const log of (data.logs || [])) {
      if (!log.topics || log.topics[0] !== GAME_RESULT_TOPIC) continue;
      try {
        const player = "0x" + log.topics[1].slice(26);
        const decoded = abiCoder.decode(["uint8","uint8","uint256","bool","uint256","uint256","uint256"], log.data);
        allGames.push({
          player, gameName: Number(decoded[0]) === 1 ? "Dice" : "Coin",
          wager: Number(decoded[2]) / 1e8, won: decoded[3],
          payout: Number(decoded[4]) / 1e8, roll: Number(decoded[6]),
          timestamp: parseFloat(log.timestamp || "0"),
          net: decoded[3] ? (Number(decoded[4]) / 1e8 - Number(decoded[2]) / 1e8) : -(Number(decoded[2]) / 1e8)
        });
      } catch {}
    }
    nextLog = (data.links && data.links.next) ? `${MIRROR_BASE}${data.links.next}` : null;
  }

  // Day boundaries (use UTC to be consistent)
  const now = new Date();
  const todayStart = new Date(now); todayStart.setUTCHours(0,0,0,0);
  const yesterdayStart = new Date(todayStart); yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
  const todayStartSec = todayStart.getTime() / 1000;
  const yesterdayStartSec = yesterdayStart.getTime() / 1000;

  const beforeYesterday = allGames.filter(g => g.timestamp < yesterdayStartSec);
  const yesterdayGames = allGames.filter(g => g.timestamp >= yesterdayStartSec && g.timestamp < todayStartSec);
  const todayGames = allGames.filter(g => g.timestamp >= todayStartSec);
  const existingBefore = new Set(beforeYesterday.map(g => g.player));

  function dayReport(games, label, existingPlayers) {
    const wins = games.filter(g => g.won);
    const losses = games.filter(g => !g.won);
    const vol = games.reduce((s,g) => s + g.wager, 0);
    const pays = wins.reduce((s,g) => s + g.payout, 0);
    const players = new Set(games.map(g => g.player));
    const newP = [...players].filter(p => !existingPlayers.has(p));
    const sorted = [...games].sort((a,b) => b.net - a.net);
    const topWins = sorted.filter(g => g.won).slice(0,3);
    const topLosses = sorted.filter(g => !g.won).sort((a,b) => a.net - b.net).slice(0,3);

    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║     ${label}`);
    console.log(`╠══════════════════════════════════════════════╣`);
    console.log(`║  Games:         ${games.length}`);
    console.log(`║  Players:       ${players.size} (${newP.length} new)`);
    console.log(`║  Volume:        ${vol.toFixed(2)} HBAR`);
    console.log(`║  Payouts:       ${pays.toFixed(2)} HBAR`);
    console.log(`║  House Take:    +${(vol - pays).toFixed(2)} HBAR`);
    console.log(`║  Win Rate:      ${games.length > 0 ? ((wins.length/games.length)*100).toFixed(1) : 0}% (${wins.length}W/${losses.length}L)`);
    console.log(`╠══════════════════════════════════════════════╣`);
    if (topWins.length > 0) {
      console.log(`║  🏆 TOP WINS`);
      for (const g of topWins) console.log(`║    ${g.gameName} | Bet ${g.wager} → ${g.payout.toFixed(2)} HBAR (+${g.net.toFixed(2)})`);
    }
    if (topLosses.length > 0) {
      console.log(`║  💀 TOP LOSSES`);
      for (const g of topLosses) console.log(`║    ${g.gameName} | Lost ${g.wager} HBAR | Roll: ${g.roll}`);
    }
    console.log(`╚══════════════════════════════════════════════╝`);
    return players;
  }

  // Print
  console.log(`╔══════════════════════════════════════════════╗`);
  console.log(`║       HASHPLAY — FULL STATUS UPDATE          ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  Contract (${contractHederaId})`);
  console.log(`║    Balance:      ${contractBal} HBAR`);
  console.log(`║  Treasury (${treasuryHederaId})`);
  console.log(`║    Balance:      ${treasuryBal} HBAR`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  Total Games:    ${totalGames.toString()}`);
  console.log(`║  Unique Users:   ${users.size} / 400 (${((users.size/400)*100).toFixed(1)}%)`);
  console.log(`║  Remaining:      ${Math.max(0, 400 - users.size)}`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  LEADERBOARD`);
  console.log(`║  Players on-chain: ${playerCount}`);
  console.log(`║  Display limit:    400 (paginated 100/page)`);
  console.log(`╚══════════════════════════════════════════════╝`);

  const yPlayers = dayReport(yesterdayGames, `YESTERDAY — ${yesterdayStart.toISOString().split('T')[0]}`, existingBefore);
  dayReport(todayGames, `TODAY — ${todayStart.toISOString().split('T')[0]}`, new Set([...existingBefore, ...yPlayers]));
}

main().catch(console.error);
