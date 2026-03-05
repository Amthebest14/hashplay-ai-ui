import { BrowserProvider, Contract, parseEther, getAddress } from 'ethers';
import { appKit } from '../context/WalletConnectContext';
import HashplayGame from '../contracts/HashplayGame.json';

import { TokenId } from '@hashgraph/sdk';
const HTS_PRECOMPILE = '0x0000000000000000000000000000000000000167';

const HTS_ABI = [
    "function associateToken(address account, address token) external returns (int64 responseCode)"
];

/**
 * Associates the connected wallet with a Hedera token via the HTS precompile.
 */
export async function associateTokenTransaction(tokenId: string) {
    const provider = appKit.getWalletProvider();
    if (!provider) throw new Error("Wallet not connected.");

    try {
        const ethersProvider = new BrowserProvider(provider as any);
        const signer = await ethersProvider.getSigner();
        const userAddress = await signer.getAddress();

        // Convert Hedera Token ID (0.0.x) to EVM address and apply strict EIP-55 Checksum formatting
        const rawTokenEvmAddress = '0x' + TokenId.fromString(tokenId).toSolidityAddress();
        const tokenEvmAddress = getAddress(rawTokenEvmAddress);

        const htsContract = new Contract(HTS_PRECOMPILE, HTS_ABI, signer);

        // Associate token (Gas limit 800000 is enough for association)
        const tx = await htsContract.associateToken(userAddress, tokenEvmAddress, { gasLimit: 800000 });
        const receipt = await tx.wait();

        return { success: true, hash: receipt.hash };
    } catch (error: any) {
        console.error("Token association failed:", error);
        return { success: false, error: error.message || "Association rejected." };
    }
}

/**
 * Executes a game transaction on the HashplayMiningEngine smart contract.
 * @param wagerAmount Amount of HBAR to wager.
 * @param gameType 1 for Dice, 2 for Coin Flip
 * @param prediction 
 *   For Dice: 1 (Lower), 2 (Equal), 3 (Higher)
 *   For Coin: 1 (Heads), 2 (Tails)
 */
export async function playMiningEngineGame(
    wagerAmount: number
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

        // Enforce proper EIP-55 Match Checksum at execution time
        const contractEvmAddress = getAddress(import.meta.env.VITE_MINING_ENGINE_ADDRESS.toLowerCase());

        // Initialize the contract connected to the user's signer
        const contract = new Contract(contractEvmAddress, HashplayGame.abi, signer);

        // Convert HBAR wager to wei (18 decimals for EVM on Hedera)
        const valueToSend = parseEther(wagerAmount.toString());

        // Call the payable play() function, sending HBAR as the wager
        const tx = await contract.play({ value: valueToSend, gasLimit: 800000 });

        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        let won = false;
        let payout = 0n;
        let hashplayReward = 0n;

        for (const log of receipt.logs) {
            try {
                const parsedLog = contract.interface.parseLog({
                    topics: log.topics as string[],
                    data: log.data
                });
                if (parsedLog?.name === 'GameResult') {
                    won = parsedLog.args.won;
                    payout = parsedLog.args.hbarPayout;
                    hashplayReward = parsedLog.args.hashplayReward;
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
            hashplayReward
        };

    } catch (error: any) {
        console.error("Game transaction failed:", error);
        return {
            success: false,
            error: error.message || "Transaction failed or was rejected."
        };
    }
}
