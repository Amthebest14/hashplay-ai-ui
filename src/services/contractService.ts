import { BrowserProvider, Contract, parseEther, getAddress } from 'ethers';
import { appKitInstance } from '../context/WalletConnectContext';

/**
 * Fetches the user's on-chain XP balance from the ArenaV5 contract.
 */
export async function getPlayerXP(userAddress: string) {
    const provider = appKitInstance.getWalletProvider();
    if (!provider) return 0n;

    try {
        const ethersProvider = new BrowserProvider(provider as any);
        const engineAddress = (import.meta.env.VITE_MINING_ENGINE_ADDRESS || '').trim();
        const contractEvmAddress = getAddress(engineAddress.toLowerCase());
        
        const abi = ["function playerXP(address) external view returns (uint256)"];
        const contract = new Contract(contractEvmAddress, abi, ethersProvider);
        const xp = await contract.playerXP(userAddress);
        return BigInt(xp);
    } catch (error) {
        console.error("Error fetching player XP:", error);
        return 0n;
    }
}

/**
 * Executes a game transaction on the HashplayArenaV5 smart contract.
 * @param wagerAmount Amount of HBAR to wager.
 * @param gameType 1 for Dice, 2 for Coin Flip
 * @param prediction User's prediction
 */
export async function playMiningEngineGame(
    wagerAmount: number,
    gameType: number,
    prediction: number
) {
    const provider = appKitInstance.getWalletProvider();
    if (!provider) {
        throw new Error("Wallet not connected. Please connect via AppKit.");
    }

    try {
        const ethersProvider = new BrowserProvider(provider as any);
        const signer = await ethersProvider.getSigner();

        const engineAddress = (import.meta.env.VITE_MINING_ENGINE_ADDRESS || '').trim();
        const contractEvmAddress = getAddress(engineAddress.toLowerCase());

        const arenaV5Interface = [
            "function play(uint8 gameType, uint8 prediction) external payable",
            "event GameResult(address indexed player, uint8 gameType, uint8 prediction, uint256 wager, bool won, uint256 hbarPayout, uint256 xpEarned, uint256 rollResult)"
        ];
        const contract = new Contract(contractEvmAddress, arenaV5Interface, signer);

        // Hedera EVM uses weibars (1 HBAR = 1e18 weibars) on the JSON-RPC relay layer.
        const valueToSend = parseEther(wagerAmount.toString());

        // Force hex gas limit to prevent wallet from overriding.
        // 0x2DC6C0 = 3,000,000. V5 uses ~2.98M gas on Hedera mainnet.
        const tx = await contract.play(gameType, prediction, { value: valueToSend, gasLimit: '0x2DC6C0' });

        const receipt = await tx.wait();

        let won = false;
        let payout = 0n;
        let pointsEarned = 0n;
        let rollResult = 0n;

        for (const log of receipt.logs) {
            try {
                const parsedLog = contract.interface.parseLog({
                    topics: log.topics as string[],
                    data: log.data
                });
                if (parsedLog?.name === 'GameResult') {
                    won = parsedLog.args.won;
                    payout = parsedLog.args.hbarPayout;
                    pointsEarned = parsedLog.args.xpEarned;
                    rollResult = parsedLog.args.rollResult;
                    break;
                }
            } catch (e) {
                // Ignore parsing errors for other logs
            }
        }

        return {
            success: true,
            hash: receipt.hash,
            won,
            payout,
            pointsEarned,
            rollResult
        };

    } catch (error: any) {
        console.error("Game transaction failed:", error);
        return {
            success: false,
            error: error.message || "Transaction failed or was rejected."
        };
    }
}
