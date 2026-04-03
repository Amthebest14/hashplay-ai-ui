import { BrowserProvider, Contract, parseEther, getAddress } from 'ethers';
import { appKitInstance } from '../context/WalletConnectContext';

import { TokenId } from '@hashgraph/sdk';
const HTS_PRECOMPILE = '0x0000000000000000000000000000000000000167';

const HTS_ABI = [
    "function associateToken(address account, address token) external returns (int64 responseCode)"
];

/**
 * Associates the connected wallet with a Hedera token via the HTS precompile.
 */
export async function associateTokenTransaction(tokenId: string) {
    const provider = appKitInstance.getWalletProvider();
    if (!provider) throw new Error("Wallet not connected.");

    try {
        const ethersProvider = new BrowserProvider(provider as any);
        const signer = await ethersProvider.getSigner();
        const userAddress = await signer.getAddress();

        const rawTokenEvmAddress = '0x' + TokenId.fromString(tokenId).toSolidityAddress();
        const tokenEvmAddress = getAddress(rawTokenEvmAddress);

        const htsContract = new Contract(HTS_PRECOMPILE, HTS_ABI, signer);

        const tx = await htsContract.associateToken(userAddress, tokenEvmAddress, { gasLimit: 800000 });
        const receipt = await tx.wait();

        return { success: true, hash: receipt.hash };
    } catch (error: any) {
        console.error("Token association failed:", error);
        return { success: false, error: error.message || "Association rejected." };
    }
}

/**
 * Fetches the user's on-chain point balance from the Arena contract scorecard.
 */
export async function getUserPoints(userAddress: string) {
    const provider = appKitInstance.getWalletProvider();
    if (!provider) return 0n;

    try {
        const ethersProvider = new BrowserProvider(provider as any);
        const engineAddress = (import.meta.env.VITE_MINING_ENGINE_ADDRESS || '').trim();
        const contractEvmAddress = getAddress(engineAddress.toLowerCase());
        
        const arenaInterface = [
            "function userPoints(address) external view returns (uint256)"
        ];
        
        const contract = new Contract(contractEvmAddress, arenaInterface, ethersProvider);
        const points = await contract.userPoints(userAddress);
        return BigInt(points);
    } catch (error) {
        console.error("Error fetching user points:", error);
        return 0n;
    }
}

/**
 * Executes a game transaction on the HashplayArenaV2 smart contract.
 * @param wagerAmount Amount of HBAR to wager.
 * @param gameType 1 for Dice, 2 for Coin Flip
 * @param prediction 
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

        const arenaV2Interface = [
            "function play(uint8 gameType, uint8 prediction) external payable",
            "event GameResult(address indexed player, uint8 gameType, uint8 prediction, uint256 wager, bool won, uint256 hbarPayout, uint256 pointsEarned, uint256 rollResult)"
        ];
        const contract = new Contract(contractEvmAddress, arenaV2Interface, signer);

        const valueToSend = parseEther(wagerAmount.toString());

        // Safe gas limit that won't trigger Wallet's strict Max-Fee Reserve checks
        const tx = await contract.play(gameType, prediction, { value: valueToSend, gasLimit: 1200000 });

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
                    pointsEarned = parsedLog.args.pointsEarned;
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
