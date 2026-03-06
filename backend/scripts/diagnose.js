require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');
const { AccountId, Client, AccountInfoQuery, TokenId, PrivateKey } = require('@hashgraph/sdk');
const fs = require('fs');
const path = require('path');

async function main() {
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const contractEvmAddress = process.env.VITE_MINING_ENGINE_ADDRESS;
    const tokenId = process.env.VITE_HASHPLAY_TOKEN_ID;
    const operatorId = "0.0.7810956";

    console.log("=== Contract Diagnostic ===");
    console.log(`Contract: ${contractEvmAddress}`);
    console.log(`Token: ${tokenId}`);

    const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    const contractJsonPath = path.resolve(__dirname, '..', 'HashplayGame.json');
    const { abi } = JSON.parse(fs.readFileSync(contractJsonPath, 'utf8'));
    const contract = new ethers.Contract(contractEvmAddress, abi, wallet);

    // 1. Check HBAR balance
    const hbarBal = await provider.getBalance(contractEvmAddress);
    console.log(`\n1. Contract HBAR Balance: ${ethers.formatEther(hbarBal)} HBAR`);

    // 2. Check what hashplayToken the contract has stored
    const storedToken = await contract.hashplayToken();
    console.log(`2. Stored hashplayToken: ${storedToken}`);

    // Expected token EVM address
    const expectedTokenId = parseInt(tokenId.split('.')[2]);
    const expectedEvmAddr = "0x" + "0".repeat(40 - expectedTokenId.toString(16).length) + expectedTokenId.toString(16).padStart(8, '0');
    console.log(`   Expected:             ${expectedEvmAddr}`);
    console.log(`   Match: ${storedToken.toLowerCase() === expectedEvmAddr.toLowerCase() ? "✅ YES" : "❌ NO"}`);

    // 3. Check Hedera SDK for token balance
    const client = Client.forTestnet().setOperator(operatorId, PrivateKey.fromStringECDSA(operatorKey));
    const contractHederaId = AccountId.fromEvmAddress(0, 0, contractEvmAddress);
    const htsTokenId = TokenId.fromString(tokenId);

    try {
        const info = await new AccountInfoQuery()
            .setAccountId(contractHederaId)
            .execute(client);

        const relationship = info.tokenRelationships.get(htsTokenId);
        if (relationship) {
            console.log(`3. Token Association: ✅ YES`);
            console.log(`   Token Balance: ${relationship.balance.toString()} smallest units (= ${Number(relationship.balance) / 1e8} tokens)`);
        } else {
            console.log(`3. Token Association: ❌ NO - This is the problem!`);
        }
    } catch (e) {
        console.log(`3. Hedera SDK check failed: ${e.message}`);
    }

    // 4. Try calling selfAssociate and see what happens
    console.log(`\n4. Testing selfAssociate call...`);
    try {
        const tx = await contract.selfAssociate({ gasLimit: 800000 });
        const receipt = await tx.wait();
        console.log(`   selfAssociate status: ${receipt.status}`);
    } catch (e) {
        console.log(`   selfAssociate error: ${e.message}`);
        // Already associated is OK
    }

    // 5. Manually try to send 1 token to the operator
    console.log(`\n5. Trying HTS transferToken from contract... (manual test)`);
    const HTS_ABI = [
        "function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64)"
    ];
    const HTS = new ethers.Contract("0x0000000000000000000000000000000000000167", HTS_ABI, wallet);

    const tokenEvmAddr = "0x00000000000000000000000000000000" + expectedTokenId.toString(16).padStart(8, '0');

    try {
        // Note: This will fail from outside — contracts must send their own tokens
        // But we can check the call encoding
        console.log(`   Token EVM Addr: ${tokenEvmAddr}`);
        console.log(`   Amount (1 token = 1e8): 100000000`);

        // Instead, call withdrawTokens which should use the same mechanism
        // Actually we cannot call transferToken from outside for the contract - the contract must be the sender
    } catch (e) {
        console.log(`   Error: ${e.message}`);
    }

    console.log(`\n=== Summary ===`);
    console.log(`HBAR balance check: ${Number(ethers.formatEther(hbarBal)) > 5 ? "✅ Sufficient" : "⚠️ Low"}`);

    client.close();
}

main().catch(console.error);
