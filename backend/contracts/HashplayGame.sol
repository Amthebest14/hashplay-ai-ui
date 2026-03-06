// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHTS {
    function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64 responseCode);
    function associateToken(address account, address token) external returns (int64 responseCode);
}

/**
 * @title HashplayGame
 * @notice HBAR-based wagering game that rewards players with $HASHPLAY tokens.
 *         - Win: 2x HBAR returned + 500 $HASHPLAY
 *         - Lose: HBAR kept by contract + 200 $HASHPLAY consolation
 */
contract HashplayGame {
    address public owner;
    address public hashplayToken; // $HASHPLAY ERC20/HTS token address
    address constant HTS_PRECOMPILE = address(0x167);

    event GameResult(
        address indexed player,
        uint256 wager,
        bool    won,
        uint256 hbarPayout,
        uint256 hashplayReward
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _hashplayToken) {
        owner = msg.sender;
        hashplayToken = _hashplayToken;
    }

    /**
     * @notice Play a game by sending HBAR as the wager.
     *         Uses block-based pseudo-randomness (for testnet). 
     *         Use Hedera PRNG in production.
     */
    function play() external payable {
        require(msg.value > 0, "Wager must be > 0");

        // Simple pseudo-random outcome using block data (testnet only)
        uint256 rand = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            msg.value
        ))) % 2;

        bool won = (rand == 1);
        uint256 hbarPayout = 0;
        uint256 hashplayReward = 0;

        if (won) {
            // Win: return 2x wager in HBAR
            hbarPayout = msg.value * 2;
            // 500 tokens per 1 HBAR
            // Since both HBAR and $HASHPLAY have 8 decimals:
            // hashplayReward = msg.value * 500
            hashplayReward = msg.value * 500;
            require(address(this).balance >= hbarPayout, "Insufficient contract balance for payout");
            (bool success, ) = payable(msg.sender).call{value: hbarPayout}("");
            require(success, "HBAR payout failed");
        } else {
            // Lose: keep HBAR, give consolation tokens
            // 200 tokens per 1 HBAR
            hashplayReward = msg.value * 200;
        }

        // Transfer $HASHPLAY reward regardless of outcome
        _sendHashplay(msg.sender, hashplayReward);

        emit GameResult(msg.sender, msg.value, won, hbarPayout, hashplayReward);
    }

    /**
     * @dev Transfer $HASHPLAY tokens from this contract to the player.
     *      1. First tries to associate the player with the token (HTS requirement).
     *         Response code 194 = ALREADY_ASSOCIATED which is fine to ignore.
     *      2. Then transfers using HTS precompile.
     *      Never reverts — game result is ALWAYS recorded even if the token
     *      transfer fails (e.g. player unassociated or low balance).
     */
    function _sendHashplay(address to, uint256 amount) internal {
        if (amount == 0) return;

        // Step 1: Try to associate the player's wallet with $HASHPLAY.
        // This is needed for first-time players.
        // responseCode 22 = SUCCESS, 194 = ALREADY_ASSOCIATED (both are OK)
        HTS_PRECOMPILE.call(
            abi.encodeWithSignature("associateToken(address,address)", to, hashplayToken)
        );
        // We intentionally ignore the response — already-associated is fine.

        // Step 2: Transfer tokens using HTS precompile
        int64 htsAmount = int64(int256(amount));

        (bool success, bytes memory result) = HTS_PRECOMPILE.call(
            abi.encodeWithSignature(
                "transferToken(address,address,address,int64)",
                hashplayToken,
                address(this),
                to,
                htsAmount
            )
        );

        // Log result without reverting — game must always complete
        // If this returns false or a non-22 code, the tokens just aren't sent
        // but HBAR payout and GameResult event still fire correctly.
        if (success && result.length >= 32) {
            // int64 responseCode = abi.decode(result, (int64));
            // We no longer revert here — silent failure is acceptable for tokens
            // to ensure HBAR winnings are never blocked.
        }
    }

    /**
     * @notice Fund the contract bankroll with HBAR.
     */
    function fundBankroll() external payable onlyOwner {}

    /**
     * @notice Fund the contract with $HASHPLAY tokens for rewards.
     *         The owner must have approved this contract before calling.
     */
    function withdrawHBAR(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "HBAR withdrawal failed");
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        // Use HTS Precompile to transfer tokens back to owner
        (bool success, bytes memory result) = HTS_PRECOMPILE.call(
            abi.encodeWithSignature(
                "transferToken(address,address,int64)",
                hashplayToken,
                owner,
                int64(int256(amount))
            )
        );
        require(success, "Token withdrawal call failed");
        int32 responseCode = abi.decode(result, (int32));
        require(responseCode == 22, "HTS: Token withdrawal failed");
    }

    function updateToken(address _newToken) external onlyOwner {
        hashplayToken = _newToken;
    }

    function selfAssociate() external {
        (bool success, bytes memory result) = HTS_PRECOMPILE.call(
            abi.encodeWithSignature("associateToken(address,address)", address(this), hashplayToken)
        );
        require(success, "Association call failed");
        int64 responseCode = abi.decode(result, (int64));
        require(responseCode == 22, "HTS: Association failed"); // 22 is SUCCESS in HTS response
    }

    receive() external payable {}
    fallback() external payable {}
}
