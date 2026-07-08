async function main() {
    const res = await fetch('https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/0.0.10627830');
    const data = await res.json();
    console.log(JSON.stringify(data.key));
    console.log("EVM Address:", data.evm_address);
}
main();
