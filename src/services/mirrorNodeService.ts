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
 * Fetches the Global XP Leaderboard by querying the contract's playerIndex,
 * then reading each player's playerXP on-chain.
 */
export async function getTopPlayersByXP(limit: number = 25): Promise<LeaderboardEntry[]> {
    try {
        const contractEvmAddress = (import.meta.env.VITE_MINING_ENGINE_ADDRESS || '').trim().toLowerCase();
        if (!contractEvmAddress) return [];

        const rpcUrl = isMainnet ? "https://mainnet.hashio.io/api" : "https://testnet.hashio.io/api";
        const provider = new JsonRpcProvider(rpcUrl);
        const abi = [
            "function getPlayerCount() view returns (uint256)",
            "function playerIndex(uint256) view returns (address)",
            "function playerXP(address) view returns (uint256)"
        ];
        const contract = new Contract(contractEvmAddress, abi, provider);

        // 1. Get total player count
        const countBig = await contract.getPlayerCount();
        const count = Number(countBig);
        if (count === 0) return [];

        // 2. Discover all players from index
        // For efficiency, we iterate the index directly. If the count grows very large (e.g. > 1000), 
        // we'll move to a mirror node state query, but for current adoption, this is the Source of Truth.
        const playerAddresses: string[] = [];
        
        // Fetch up to 100 players directly from index (safety limit for RPC)
        const fetchCount = Math.min(count, 100);
        await Promise.all(
            Array.from({ length: fetchCount }, (_, i) => i).map(async (i) => {
                try {
                    const addr = await contract.playerIndex(i);
                    playerAddresses.push(addr);
                } catch {}
            })
        );

        const entries: LeaderboardEntry[] = [];

        // 3. Query each player's XP and resolve labels
        await Promise.all(playerAddresses.map(async (evmAddr) => {
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
