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
 * Also checks if the account is associated with the $HASHPLAY token.
 */
export async function getAccountBalances(accountId: string): Promise<{ hbar: number, hashplay: number, isAssociated: boolean }> {
    try {
        const response = await fetch(`${HEDERA_TESTNET_MIRROR}/accounts/${accountId}`);
        if (!response.ok) return { hbar: 0, hashplay: 0, isAssociated: false };

        const data: AccountInfo = await response.json();

        const hbarBalance = data.balance.balance / 100000000; // tinybars to HBAR

        const hashplayTokenId = import.meta.env.VITE_HASHPLAY_TOKEN_ID;
        // Check if the token exists internally in the user's token array (even with 0 balance)
        const hashplayRecord = data.balance.tokens.find(t => t.token_id === hashplayTokenId);
        const isAssociated = !!hashplayRecord;

        // $HASHPLAY has 8 decimals
        const hashplayBalance = hashplayRecord ? hashplayRecord.balance / 1e8 : 0;

        return { hbar: hbarBalance, hashplay: hashplayBalance, isAssociated };
    } catch (error) {
        console.error("Error fetching account balances:", error);
        return { hbar: 0, hashplay: 0, isAssociated: false };
    }
}

/**
 * Fetches the Total Mined $HASHPLAY based on the current Total Supply.
 */
export async function getTotalMined(): Promise<number> {
    try {
        const hashplayTokenId = import.meta.env.VITE_HASHPLAY_TOKEN_ID;
        const response = await fetch(`${HEDERA_TESTNET_MIRROR}/tokens/${hashplayTokenId}`);
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
 */
export async function getTopHolders(limit: number = 25): Promise<LeaderboardEntry[]> {
    try {
        const hashplayTokenId = import.meta.env.VITE_HASHPLAY_TOKEN_ID;
        const response = await fetch(`${HEDERA_TESTNET_MIRROR}/tokens/${hashplayTokenId}/balances?limit=${limit}&order=desc`);
        if (!response.ok) return [];

        const data = await response.json();

        return data.balances.map((b: any) => ({
            account: b.account,
            balance: b.balance / 1e8 // Adjust for token decimals (8 for $HASHPLAY)
        }));
    } catch (error) {
        console.error("Error fetching top holders:", error);
        return [];
    }
}
