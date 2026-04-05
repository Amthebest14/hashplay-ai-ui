require('dotenv').config({ path: '../.env' });
const { ethers, getAddress } = require('ethers');

async function main() {
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet(operatorKey, provider);

    const contracts = [
        { id: '0.0.10418933', evm: '0xb20526EFBD008bB488f760F222cE9afb712F7024' }, // V3
        { id: '0.0.10419246', evm: '0xe8df32C593dB1f129a67CDe3c40F47a25039f600' }, // V4
        { id: '0.0.10419442', evm: '0x1C1C88BD8427eF30349Ff60222cE9afb712F7024' }, // V4-Opt
        { id: '0.0.10420289', evm: '0xb424bd941fdc76706ed4b530f7a95d62c05678f8' }, // V5-Fail-1
        { id: '0.0.10420291', evm: '0x5e238df850c258a199afea2c1c64bf4264f8c3fa' }  // V5-Fail-2
    ];

    const abi = [
        {
            "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
            "name": "withdrawHBAR",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ];

    for (const item of contracts) {
        try {
            const checksumAddress = getAddress(item.evm.toLowerCase());
            console.log(`\n--- Draining ${item.id} (${checksumAddress}) ---`);
            
            // Get balance in tinybars
            const balanceRes = await fetch(`https://mainnet.mirrornode.hedera.com/api/v1/balances?account.id=${item.id}`);
            const balanceData = await balanceRes.json();
            const tinybars = balanceData.balances[0].balance;

            if (parseInt(tinybars) < 10000000) {
                console.log("Balance too low, skipping.");
                continue;
            }

            console.log(`Current Balance: ${parseInt(tinybars) / 1e8} HBAR`);

            const iface = new ethers.Interface(abi);
            const data = iface.encodeFunctionData("withdrawHBAR", [tinybars]);
            
            console.log(`Executing manual withdrawHBAR(${tinybars}) to ${checksumAddress}...`);
            const tx = await wallet.sendTransaction({
                to: checksumAddress,
                data: data,
                gasLimit: 200000
            });
            console.log(`Sent: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ Success for ${item.id}`);

        } catch (e) {
            console.error(`❌ Error on ${item.id}: ${e.message}`);
            // Add a small delay for potential network issues
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

main().catch(console.error);
