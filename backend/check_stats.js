require("dotenv").config({ path: "../.env" });
const { ethers } = require("ethers");

const MIRROR_BASE = "https://mainnet-public.mirrornode.hedera.com";
const MIRROR = `${MIRROR_BASE}/api/v1`;

async function main() {
  const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
  const contractAddress = process.env.VITE_MINING_ENGINE_ADDRESS;

  // 1. On-chain reads
  const abi = [
    "function totalGamesPlayed() view returns (uint256)",
    "function treasuryWallet() view returns (address)"
  ];
  const contract = new ethers.Contract(contractAddress, abi, provider);

  const [totalGames, treasury, balanceWei] = await Promise.all([
    contract.totalGamesPlayed(),
    contract.treasuryWallet(),
    provider.getBalance(contractAddress)
  ]);
  const tvl = ethers.formatEther(balanceWei);

  // 2. Resolve Hedera ID
  const accRes = await fetch(`${MIRROR}/accounts/${contractAddress}`);
  const accData = await accRes.json();
  const contractHederaId = accData.account;

  // 3. Use contract results endpoint for volume tracking
  console.log(`Fetching contract call results for ${contractHederaId}...`);

  let totalVolumeIn = 0;    // tinybars wagered (sent to contract)
  let totalVolumeOut = 0;   // tinybars paid out
  let txCount = 0;
  let nextUrl = `${MIRROR}/contracts/${contractHederaId}/results?limit=100&order=asc`;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    const data = await res.json();

    for (const r of (data.results || [])) {
      txCount++;
      const amountIn = Number(r.amount || 0); // tinybars sent with the call
      totalVolumeIn += amountIn;
    }

    // Fix pagination: next link includes /api/v1 already, use base domain
    if (data.links && data.links.next) {
      nextUrl = `${MIRROR_BASE}${data.links.next}`;
    } else {
      nextUrl = null;
    }
  }

  // 4. Get outflows from transfer-based transaction query
  let nextTxUrl = `${MIRROR}/transactions?account.id=${contractHederaId}&limit=100&order=asc`;
  let totalTxns = 0;

  while (nextTxUrl) {
    const res = await fetch(nextTxUrl);
    const data = await res.json();

    for (const tx of (data.transactions || [])) {
      if (tx.result !== "SUCCESS") continue;
      totalTxns++;

      for (const transfer of (tx.transfers || [])) {
        if (transfer.account === contractHederaId) {
          const amt = Number(transfer.amount);
          if (amt < 0) totalVolumeOut += Math.abs(amt);
        }
      }
    }

    if (data.links && data.links.next) {
      nextTxUrl = `${MIRROR_BASE}${data.links.next}`;
    } else {
      nextTxUrl = null;
    }
  }

  const volumeInHbar = totalVolumeIn / 1e8;
  const volumeOutHbar = totalVolumeOut / 1e8;
  const totalVolume = volumeInHbar + volumeOutHbar;

  console.log(`\n========================================`);
  console.log(`   HASHPLAY ARENA V4 — LIVE STATS`);
  console.log(`========================================`);
  console.log(`Contract:           ${contractAddress}`);
  console.log(`Hedera ID:          ${contractHederaId}`);
  console.log(`Treasury:           ${treasury}`);
  console.log(`----------------------------------------`);
  console.log(`Total Games (chain): ${totalGames.toString()}`);
  console.log(`Contract Calls:      ${txCount}`);
  console.log(`All Txns:            ${totalTxns}`);
  console.log(`----------------------------------------`);
  console.log(`Total Volume:        ${totalVolume.toFixed(2)} HBAR`);
  console.log(`  ↳ Inflow (wagers): ${volumeInHbar.toFixed(2)} HBAR`);
  console.log(`  ↳ Outflow (pays):  ${volumeOutHbar.toFixed(2)} HBAR`);
  console.log(`----------------------------------------`);
  console.log(`TVL (Balance):       ${tvl} HBAR`);
  console.log(`========================================`);
}

main().catch(console.error);
