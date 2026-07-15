import { BrowserProvider, Contract, parseEther, getAddress, parseUnits } from 'ethers';
import { appKitInstance } from '../context/WalletConnectContext';

const arenaV5Interface = [
    {
        "inputs": [
            { "internalType": "uint8", "name": "gameType", "type": "uint8" },
            { "internalType": "uint8", "name": "prediction", "type": "uint8" }
        ],
        "name": "play",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
            { "indexed": false, "internalType": "uint8", "name": "gameType", "type": "uint8" },
            { "indexed": false, "internalType": "uint8", "name": "prediction", "type": "uint8" },
            { "indexed": false, "internalType": "uint256", "name": "wager", "type": "uint256" },
            { "indexed": false, "internalType": "bool", "name": "won", "type": "bool" },
            { "indexed": false, "internalType": "uint256", "name": "hbarPayout", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "xpEarned", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "rollResult", "type": "uint256" }
        ],
        "name": "GameResult",
        "type": "event"
    },
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "playerXP",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
];

export async function getPlayerXP(userAddress: string) {
    const provider = appKitInstance.getWalletProvider();
    if (!provider) return 0n;
    try {
        const ethersProvider = new BrowserProvider(provider as any);
        const engineAddress = (import.meta.env.VITE_MINING_ENGINE_ADDRESS || '0x0000000000000000000000000000000000a26b96').trim();
        const contract = new Contract(getAddress(engineAddress.toLowerCase()), arenaV5Interface, ethersProvider);
        const xp = await contract.playerXP(userAddress);
        return BigInt(xp);
    } catch (error) {
        console.error("Error fetching player XP:", error);
        return 0n;
    }
}

export async function playMiningEngineGame(wagerAmount: number, gameType: number, prediction: number) {
    const provider = appKitInstance.getWalletProvider();
    if (!provider) throw new Error("Wallet not connected.");
    try {
        const ethersProvider = new BrowserProvider(provider as any);
        const signer = await ethersProvider.getSigner();
        const engineAddress = (import.meta.env.VITE_MINING_ENGINE_ADDRESS || '0x0000000000000000000000000000000000a26b96').trim();
        const contract = new Contract(getAddress(engineAddress.toLowerCase()), arenaV5Interface, signer);
        
        const valueToSend = parseEther(wagerAmount.toString());
        const tx = await (contract as any).play(gameType, prediction, { 
            value: valueToSend, 
            gasLimit: '0xC3500',
            gasPrice: parseUnits('1500', 'gwei')
        });

        const receipt = await tx.wait();
        let result = { success: true, hash: receipt.hash, won: false, payout: 0n, pointsEarned: 0n, rollResult: 0n };

        for (const log of receipt.logs) {
            try {
                const parsedLog = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
                if (parsedLog?.name === 'GameResult') {
                    result.won = parsedLog.args.won;
                    result.payout = parsedLog.args.hbarPayout;
                    result.pointsEarned = parsedLog.args.xpEarned;
                    result.rollResult = parsedLog.args.rollResult;
                    break;
                }
            } catch (e) {}
        }
        return result;
    } catch (error: any) {
        console.error("Game transaction failed:", error);
        return { success: false, error: error.message || "Transaction failed." };
    }
}
