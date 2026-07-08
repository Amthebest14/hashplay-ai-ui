const MIRROR_BASE = "https://mainnet-public.mirrornode.hedera.com";
const MIRROR = `${MIRROR_BASE}/api/v1`;

async function main() {
  // Check raw logs without topic filter
  const contractId = "0.0.10420650";
  
  const url = `${MIRROR}/contracts/${contractId}/results/logs?limit=3&order=desc`;
  console.log("Fetching:", url);
  const res = await fetch(url);
  const data = await res.json();

  if (data.logs && data.logs.length > 0) {
    console.log(`Found ${data.logs.length} logs\n`);
    for (const log of data.logs) {
      console.log("Topics:", JSON.stringify(log.topics));
      console.log("Data length:", log.data?.length);
      console.log("Data preview:", log.data?.slice(0, 130));
      console.log("---");
    }
  } else {
    console.log("No logs found");
    console.log("Response:", JSON.stringify(data, null, 2).slice(0, 500));
  }
}

main().catch(console.error);
