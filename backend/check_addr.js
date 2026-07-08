async function main() {
    const MIRROR = "https://mainnet-public.mirrornode.hedera.com/api/v1";
    
    // Check where funds actually went
    const wrongAcc = "0.0.7532574";
    const correctAcc = "0.0.7534334";
    
    const [wrongRes, correctRes] = await Promise.all([
        fetch(`${MIRROR}/accounts/${wrongAcc}`),
        fetch(`${MIRROR}/accounts/${correctAcc}`)
    ]);
    const wrongData = await wrongRes.json();
    const correctData = await correctRes.json();
    
    console.log(`\nWRONG destination (funds sent here) - ${wrongAcc}:`);
    console.log(`  Balance: ${(wrongData.balance?.balance || 0) / 1e8} HBAR`);
    console.log(`  Memo:    "${wrongData.memo}"`);
    console.log(`  Created: ${wrongData.created_timestamp}`);
    console.log(`  Key:     ${JSON.stringify(wrongData.key)}`);
    
    console.log(`\nCORRECT destination (user's wallet) - ${correctAcc}:`);
    console.log(`  Balance: ${(correctData.balance?.balance || 0) / 1e8} HBAR`);
    console.log(`  Memo:    "${correctData.memo}"`);
    console.log(`  Created: ${correctData.created_timestamp}`);
}
main().catch(console.error);
