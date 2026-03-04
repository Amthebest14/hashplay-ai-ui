import { BrowserProvider, Contract, parseEther } from 'ethers';
import { appKit } from '../context/WalletConnectContext';
import HashplayMiningEngine from '../contracts/HashplayMiningEngine.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_MINING_ENGINE_ADDRESS;

/**
 * Executes a game transaction on the HashplayMiningEngine smart contract.
 * @param wagerAmount Amount of HBAR to wager.
 * @param gameType 1 for Dice, 2 for Coin Flip
 * @param prediction 
 *   For Dice: 1 (Lower), 2 (Equal), 3 (Higher)
 *   For Coin: 1 (Heads), 2 (Tails)
 */
export async function playMiningEngineGame(
    wagerAmount: number,
    gameType: number,
    prediction: number
) {
    // Ensure wallet is connected
    const provider = appKit.getWalletProvider();
    if (!provider) {
        throw new Error("Wallet not connected. Please connect via AppKit.");
    }

    try {
        // Create an ethers provider using the AppKit injected EIP1193 provider
        const ethersProvider = new BrowserProvider(provider as any);
        const signer = await ethersProvider.getSigner();

        // Initialize the contract connected to the user's signer
        const contract = new Contract(CONTRACT_ADDRESS, HashplayMiningEngine.abi, signer);

        // Convert HBAR wager to tinybars/wei equivalent (18 decimals for EVM compatibility on Hedera)
        const valueToSend = parseEther(wagerAmount.toString());

        // Send the transaction to the play function
        const tx = await contract.play(gameType, prediction, { value: valueToSend });

        // Wait for the transaction to be mined (included in a block)
        const receipt = await tx.wait();

        return {
            success: true,
            hash: receipt.hash,
            // You can parse logs here to determine the exact outcome if needed
        };

    } catch (error: any) {
        console.error("Game transaction failed:", error);
        return {
            success: false,
            error: error.message || "Transaction failed or was rejected."
        };
    }
}
