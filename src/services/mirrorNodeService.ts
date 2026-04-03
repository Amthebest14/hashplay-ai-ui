/**
 * Hedera Mirror Node Service for Hashplay AI
 * Fetches token balances and leaderboard data without requiring a connected wallet.
 */

import { Contract, JsonRpcProvider } from 'ethers';

const rawNetwork = import.meta.env.VITE_NETWORK || 'testnet';
const isMainnet = rawNetwork.trim().toLowerCase() === 'mainnet';
const HEDERA_MIRROR = isMainnet
    ? "https://mainnet-public.mirrornode.hedera.com/api/v1"
    : "https://testnet.mirrornode.hedera.com/api/v1";

export interface TokenBalance {
    token_id: string;
    balance: number;
}

export interface AccountInfo {
    account: string;
    balance: {
        balance: number; // HBAR balance in tinybars
        tokens: TokenBalance[];
    };
}

export interface LeaderboardEntry {
    account: string;
    balance: number;
    points?: number; // Fetched from smart contract
}

/**
 * Fetches the HBAR and Token balances for a given Hedera Account ID.
 * Also checks if the account is associated with the $HASHPLAY token.
 */
export async function getAccountBalances(accountId: string): Promise<{ hbar: number, hashplay: number, isAssociated: boolean, nativeId: string }> {
    try {
        const tokenIdRaw = import.meta.env.VITE_HASHPLAY_TOKEN_ID || '';
        const hashplayTokenId = tokenIdRaw.trim();

        // Fetch HBAR balance from the main account endpoint
        const accountResponse = await fetch(`${HEDERA_MIRROR}/accounts/${accountId}`);
        if (!accountResponse.ok) return { hbar: 0, hashplay: 0, isAssociated: false, nativeId: accountId };
        const accountData: AccountInfo = await accountResponse.json();
        const hbarBalance = accountData.balance.balance / 100000000; // tinybars to HBAR
        const nativeId = accountData.account; // Extract the true 0.0.X format

        // Fetch the specific $HASHPLAY token balance from the dedicated tokens endpoint
        // This is more reliable than reading from the limited balance.tokens array
        const tokenResponse = await fetch(`${HEDERA_MIRROR}/accounts/${accountId}/tokens?token.id=${hashplayTokenId}&limit=1`);
        if (!tokenResponse.ok) return { hbar: hbarBalance, hashplay: 0, isAssociated: false, nativeId };
        const tokenData = await tokenResponse.json();

        const tokenRecord = tokenData.tokens?.[0];
        const isAssociated = !!tokenRecord;
        // $HASHPLAY has 8 decimals
        const hashplayBalance = tokenRecord ? tokenRecord.balance / 1e8 : 0;

        return { hbar: hbarBalance, hashplay: hashplayBalance, isAssociated, nativeId };
    } catch (error) {
        console.error("Error fetching account balances:", error);
        return { hbar: 0, hashplay: 0, isAssociated: false, nativeId: accountId };
    }
}

/**
 * Fetches the Total Mined $HASHPLAY based on the current Total Supply.
 */
export async function getTotalMined(): Promise<number> {
    try {
        const tokenIdRaw = import.meta.env.VITE_HASHPLAY_TOKEN_ID || '';
        const hashplayTokenId = tokenIdRaw.trim();
        const response = await fetch(`${HEDERA_MIRROR}/tokens/${hashplayTokenId}`);
        if (!response.ok) return 0;

        const data = await response.json();
        const supply = parseInt(data.total_supply);
        const decimals = parseInt(data.decimals) || 8;
        return supply / Math.pow(10, decimals);
    } catch (error) {
        console.error("Error fetching total mined:", error);
        return 0;
    }
}

/**
 * Fetches the Top token holders for the leaderboard.
 * Filters out Treasury, Token, and Smart Contract addresses.
 */
export async function getTopHolders(limit: number = 25): Promise<LeaderboardEntry[]> {
    try {
        const hashplayTokenId = (import.meta.env.VITE_HASHPLAY_TOKEN_ID || '').trim();
        const treasuryId = (import.meta.env.VITE_TREASURY_ACCOUNT_ID || '').trim();
        const contractEvmAddress = (import.meta.env.VITE_MINING_ENGINE_ADDRESS || '').trim();

        // Fetch top 100 to have room for filtering out many contracts
        const response = await fetch(`${HEDERA_MIRROR}/tokens/${hashplayTokenId}/balances?limit=100&order=desc`);
        if (!response.ok) return [];

        const data = await response.json();

        // Find the current Game Contract's Hedera ID from its EVM address
        let currentContractId = "0.0.0";
        try {
            const contractRes = await fetch(`${HEDERA_MIRROR}/accounts/${contractEvmAddress}`);
            if (contractRes.ok) {
                const contractData = await contractRes.json();
                currentContractId = contractData.account;
            }
        } catch (e) {
            console.error("Error finding current contract ID:", e);
        }

        // Filter: 
        // 1. Not Treasury
        // 2. Not the Token itself
        // 3. Not the current Game Contract
        // 4. Not extremely high "contract bankroll" balances (heuristic)
        const entries: LeaderboardEntry[] = data.balances
            .map((b: any) => ({
                account: b.account,
                balance: b.balance / 1e8
            }))
            .filter((entry: LeaderboardEntry) =>
                entry.account !== treasuryId &&
                entry.account !== hashplayTokenId &&
                entry.account !== currentContractId &&
                entry.account !== "0.0.8091335" && // Old contracts
                entry.account !== "0.0.8095682" &&
                entry.account !== "0.0.8095745" &&
                entry.account !== "0.0.8095658" &&
                entry.account !== "0.0.8095531" &&
                entry.account !== "0.0.8095848" &&
                entry.account !== "0.0.8103703" && // V1 Contract Removed
                entry.balance < 10000000
            )
            .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.balance - a.balance) 
            .slice(0, limit);

        // Fetch User Points from Smart Contract
        try {
            const rpcUrl = isMainnet ? "https://mainnet.hashio.io/api" : "https://testnet.hashio.io/api";
            const provider = new JsonRpcProvider(rpcUrl);
            const abi = ["function userPoints(address) view returns (uint256)"];
            const contract = new Contract(contractEvmAddress, abi, provider);

            await Promise.all(entries.map(async (entry) => {
                try {
                    // Resolve Hedera Account ID to EVM Address via Mirror Node
                    const accRes = await fetch(`${HEDERA_MIRROR}/accounts/${entry.account}`);
                    if (!accRes.ok) return;
                    const accData = await accRes.json();
                    const evmAddress = accData.evm_address;

                    if (evmAddress) {
                        const points = await contract.userPoints(evmAddress);
                        entry.points = Number(points);
                    }
                } catch (err) {
                    console.error(`Failed to fetch points for ${entry.account}`, err);
                }
            }));
        } catch (contractErr) {
            console.error("Error connecting to contract for points:", contractErr);
        }

        return entries;
    } catch (error) {
        console.error("Error fetching top holders:", error);
        return [];
    }
}
