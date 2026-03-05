// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHTS {
    function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64 responseCode);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
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

    uint256 public constant WIN_HASHPLAY_REWARD  = 500 * 1e8; // 500 tokens (8 decimals)
    uint256 public constant LOSE_HASHPLAY_REWARD = 200 * 1e8; // 200 tokens (8 decimals)

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
            hashplayReward = WIN_HASHPLAY_REWARD;
            require(address(this).balance >= hbarPayout, "Insufficient contract balance for payout");
            payable(msg.sender).transfer(hbarPayout);
        } else {
            // Lose: keep HBAR, give consolation tokens
            hashplayReward = LOSE_HASHPLAY_REWARD;
        }

        // Transfer $HASHPLAY reward regardless of outcome
        _sendHashplay(msg.sender, hashplayReward);

        emit GameResult(msg.sender, msg.value, won, hbarPayout, hashplayReward);
    }

    /**
     * @dev Transfer $HASHPLAY tokens from this contract to the player.
     */
    function _sendHashplay(address to, uint256 amount) internal {
        IERC20 token = IERC20(hashplayToken);
        uint256 contractBalance = token.balanceOf(address(this));
        if (contractBalance >= amount) {
            token.transfer(to, amount);
        }
        // If insufficient token balance, skip gracefully (don't block the game)
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
        payable(owner).transfer(amount);
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        IERC20(hashplayToken).transfer(owner, amount);
    }

    function updateToken(address _newToken) external onlyOwner {
        hashplayToken = _newToken;
    }

    receive() external payable {}
    fallback() external payable {}
}
