/**
 * Hedera Mirror Node Service for Hashplay AI
 * Fetches token balances and leaderboard data without requiring a connected wallet.
 */

const HEDERA_TESTNET_MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";

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
}

/**
 * Fetches the HBAR and Token balances for a given Hedera Account ID.
 */
export async function getAccountBalances(accountId: string): Promise<{ hbar: number, hashplay: number }> {
    try {
        const response = await fetch(`${HEDERA_TESTNET_MIRROR}/accounts/${accountId}`);
        if (!response.ok) return { hbar: 0, hashplay: 0 };

        const data: AccountInfo = await response.json();

        const hbarBalance = data.balance.balance / 100000000; // tinybars to HBAR

        const hashplayTokenId = import.meta.env.VITE_HASHPLAY_TOKEN_ID;
        const hashplayRecord = data.balance.tokens.find(t => t.token_id === hashplayTokenId);

        // Assuming 2 decimals for the token based on previous genesis output
        const hashplayBalance = hashplayRecord ? hashplayRecord.balance / 100 : 0;

        return { hbar: hbarBalance, hashplay: hashplayBalance };
    } catch (error) {
        console.error("Error fetching account balances:", error);
        return { hbar: 0, hashplay: 0 };
    }
}

/**
 * Fetches the Top token holders for the leaderboard.
 */
export async function getTopHolders(limit: number = 25): Promise<LeaderboardEntry[]> {
    try {
        const hashplayTokenId = import.meta.env.VITE_HASHPLAY_TOKEN_ID;
        const response = await fetch(`${HEDERA_TESTNET_MIRROR}/tokens/${hashplayTokenId}/balances?limit=${limit}&order=desc`);
        if (!response.ok) return [];

        const data = await response.json();

        return data.balances.map((b: any) => ({
            account: b.account,
            balance: b.balance / 100 // Adjust for token decimals
        }));
    } catch (error) {
        console.error("Error fetching top holders:", error);
        return [];
    }
}
