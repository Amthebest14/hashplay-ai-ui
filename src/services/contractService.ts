// @ts-nocheck
import { BrowserProvider, Contract, parseEther } from 'ethers';
import { ContractExecuteTransaction, ContractFunctionParameters, Hbar, ContractId } from "@hashgraph/sdk";
import { hashconnect } from '../context/WalletConnectContext';
import HashplayMiningEngine from '../contracts/HashplayMiningEngine.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_MINING_ENGINE_ADDRESS;

/**
 * Executes a game transaction on the HashplayMiningEngine smart contract.
 * @param providerConfig The dual wallet state containing `isHCConnected`, `w3mProvider`, `hcSessionData`.
 * @param wagerAmount Amount of HBAR to wager.
 * @param gameType 1 for Dice, 2 for Coin Flip
 * @param prediction 
 *   For Dice: 1 (Lower), 2 (Equal), 3 (Higher)
 *   For Coin: 1 (Heads), 2 (Tails)
 */
export async function playMiningEngineGame(
    providerConfig: { isHCConnected: boolean; w3mProvider: any; hcSessionData: any },
    wagerAmount: number,
    gameType: number,
    prediction: number
) {
    try {
        if (providerConfig.isHCConnected && providerConfig.hcSessionData?.accountIds?.[0]) {
            // --- HASHCONNECT EXECUTION (Native Hedera SDK) ---
            const accountId = providerConfig.hcSessionData.accountIds[0];

            // Convert EVM address to Contract ID explicitly for the Hedera SDK
            const contractId = ContractId.fromEvmAddress(0, 0, CONTRACT_ADDRESS);

            const tx = new ContractExecuteTransaction()
                .setContractId(contractId)
                .setGas(500000)
                .setPayableAmount(new Hbar(wagerAmount))
                .setFunction(
                    "play",
                    new ContractFunctionParameters().addUint256(gameType).addUint256(prediction)
                );

            const res = await hashconnect.sendTransaction(accountId, tx);

            if (res.receipt?.status?.toString() === 'SUCCESS') {
                return { success: true, hash: res.transactionId };
            } else {
                throw new Error("Transaction execution failed or was rejected in HashPack.");
            }

        } else if (providerConfig.w3mProvider) {
            // --- WEB3MODAL EXECUTION (Ethers.js EVM Wrapper) ---
            const ethersProvider = new BrowserProvider(providerConfig.w3mProvider);
            const signer = await ethersProvider.getSigner();

            const contract = new Contract(CONTRACT_ADDRESS, HashplayMiningEngine.abi, signer);
            const valueToSend = parseEther(wagerAmount.toString());

            const tx = await contract.play(gameType, prediction, { value: valueToSend });
            const receipt = await tx.wait();

            return { success: true, hash: receipt.hash };

        } else {
            throw new Error("No connected wallet provider found.");
        }

    } catch (error: any) {
        console.error("Game transaction failed:", error);
        return {
            success: false,
            error: error.message || "Transaction failed or was rejected."
        };
    }
}
