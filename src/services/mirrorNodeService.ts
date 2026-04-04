/**
 * Hedera Mirror Node Service for Hashplay AI
 * Fetches HBAR balances and XP leaderboard data.
 */

import { Contract, JsonRpcProvider } from 'ethers';

const rawNetwork = import.meta.env.VITE_NETWORK || 'testnet';
const isMainnet = rawNetwork.trim().toLowerCase() === 'mainnet';
const HEDERA_MIRROR = isMainnet
    ? "https://mainnet-public.mirrornode.hedera.com/api/v1"
    : "https://testnet.mirrornode.hedera.com/api/v1";

export interface LeaderboardEntry {
    account: string;
    xp: number;
}

/**
 * Fetches the HBAR balance and native Hedera ID for a given address.
 */
export async function getAccountBalances(accountId: string): Promise<{ hbar: number, nativeId: string }> {
    try {
        const accountResponse = await fetch(`${HEDERA_MIRROR}/accounts/${accountId}`);
        if (!accountResponse.ok) return { hbar: 0, nativeId: accountId };
        const accountData = await accountResponse.json();
        const hbarBalance = accountData.balance.balance / 100000000;
        const nativeId = accountData.account;
        return { hbar: hbarBalance, nativeId };
    } catch (error) {
        console.error("Error fetching account balances:", error);
        return { hbar: 0, nativeId: accountId };
    }
}

/**
 * Fetches the Global XP Leaderboard by querying XPAwarded events from the contract,
 * then reading each player's playerXP on-chain.
 */
export async function getTopPlayersByXP(limit: number = 25): Promise<LeaderboardEntry[]> {
    try {
        const contractEvmAddress = (import.meta.env.VITE_MINING_ENGINE_ADDRESS || '').trim().toLowerCase();
        if (!contractEvmAddress) return [];

        // 1. Find the contract's Hedera ID
        const contractRes = await fetch(`${HEDERA_MIRROR}/accounts/${contractEvmAddress}`);
        if (!contractRes.ok) return [];
        const contractData = await contractRes.json();
        const contractId = contractData.account;

        // 2. Fetch XPAwarded logs to discover unique players
        // XPAwarded(address indexed player, uint256 amount)
        // keccak256("XPAwarded(address,uint256)") = topic0
        const logsUrl = `${HEDERA_MIRROR}/contracts/${contractId}/results/logs?limit=100&order=desc`;
        const logsRes = await fetch(logsUrl);
        if (!logsRes.ok) return [];
        const logsData = await logsRes.json();

        // Extract unique player addresses from indexed topic[1]
        const uniquePlayers = new Set<string>();
        for (const log of logsData.logs || []) {
            if (log.topics && log.topics.length >= 2) {
                // topic[1] is the indexed player address (padded to 32 bytes)
                const rawAddr = '0x' + log.topics[1].slice(26);
                uniquePlayers.add(rawAddr.toLowerCase());
            }
        }

        if (uniquePlayers.size === 0) return [];

        // 3. Query each player's XP on-chain
        const rpcUrl = isMainnet ? "https://mainnet.hashio.io/api" : "https://testnet.hashio.io/api";
        const provider = new JsonRpcProvider(rpcUrl);
        const abi = ["function playerXP(address) view returns (uint256)"];
        const contract = new Contract(contractEvmAddress, abi, provider);

        const entries: LeaderboardEntry[] = [];

        await Promise.all(Array.from(uniquePlayers).map(async (evmAddr) => {
            try {
                const xp = await contract.playerXP(evmAddr);
                const xpNum = Number(xp);
                if (xpNum > 0) {
                    // Try to resolve Hedera account ID
                    let displayAccount = evmAddr;
                    try {
                        const accRes = await fetch(`${HEDERA_MIRROR}/accounts/${evmAddr}`);
                        if (accRes.ok) {
                            const accData = await accRes.json();
                            displayAccount = accData.account || evmAddr;
                        }
                    } catch {}
                    entries.push({ account: displayAccount, xp: xpNum });
                }
            } catch (err) {
                console.error(`Failed to fetch XP for ${evmAddr}`, err);
            }
        }));

        // Sort by XP descending and limit
        entries.sort((a, b) => b.xp - a.xp);
        return entries.slice(0, limit);

    } catch (error) {
        console.error("Error fetching XP leaderboard:", error);
        return [];
    }
}
