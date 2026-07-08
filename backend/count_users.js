const MIRROR_BASE = "https://mainnet-public.mirrornode.hedera.com";
const MIRROR = `${MIRROR_BASE}/api/v1`;

async function main() {
  const contractEvm = "0xcec25013eCE3eC5a1b090261880eb2aeB7ffb9c8";
  const accRes = await fetch(`${MIRROR}/accounts/${contractEvm}`);
  const accData = await accRes.json();
  const contractId = accData.account;

  // Count unique wallets from contract results
  const users = new Set();
  let nextUrl = `${MIRROR}/contracts/${contractId}/results?limit=100&order=asc`;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    const data = await res.json();

    for (const r of (data.results || [])) {
      if (r.from) users.add(r.from.toLowerCase());
    }

    if (data.links && data.links.next) {
      nextUrl = `${MIRROR_BASE}${data.links.next}`;
    } else {
      nextUrl = null;
    }
  }

  console.log(`\n========================================`);
  console.log(`   HASHPLAY — UNIQUE USER TRACKER`);
  console.log(`========================================`);
  console.log(`Contract:        ${contractId}`);
  console.log(`Unique Wallets:  ${users.size}`);
  console.log(`Target:          400`);
  console.log(`Remaining:       ${Math.max(0, 400 - users.size)}`);
  console.log(`Progress:        ${((users.size / 400) * 100).toFixed(1)}%`);
  console.log(`========================================`);
  console.log(`\n📎 HashScan Proof Link:`);
  console.log(`   https://hashscan.io/mainnet/contract/${contractId}`);
  console.log(`\n📎 Mirror Node API (verifiable):`);
  console.log(`   ${MIRROR}/contracts/${contractId}/results?limit=100&order=desc`);
  console.log(`========================================`);
}

main().catch(console.error);
