// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPlayToken {
    function rewardPlayer(address player, uint256 playAmount, bool won) external;
}

/**
 * @title HashplayArenaV6 — Token Integration
 * @notice Casino wagering contract with integrated on-chain XP system AND $PLAY token rewards.
 *         Features:
 *         - No HTS: Pure on-chain XP mapping
 *         - Automated Treasury: 5% fee on losses
 *         - On-Chain Scorecard: Tracks and ranks top players
 *         - $PLAY Integration: Awards 500 PLAY for wins, 200 PLAY for losses
 */
contract HashplayArenaV6 is Ownable, ReentrancyGuard {
    
    // State Variables
    address public treasuryWallet;
    mapping(address => uint256) public playerXP;
    uint256 public totalGamesPlayed;
    
    // $PLAY Token Interface
    IPlayToken public playToken;
    uint256 public constant PLAY_DECIMALS = 1e8;

    // Player Registry for Leaderboard
    address[] public playerIndex;
    mapping(address => bool) private hasPlayed;

    // Events
    event GameResult(
        address indexed player,
        uint8   gameType, // 1: Dice, 2: Coin
        uint8   prediction,
        uint256 wager,
        bool    won,
        uint256 hbarPayout,
        uint256 xpEarned,
        uint256 rollResult
    );

    event TreasuryUpdated(address newTreasury);
    event XPAwarded(address indexed player, uint256 amount);
    event PlayTokenUpdated(address newToken);

    constructor(address _treasuryWallet, address _playToken) Ownable(msg.sender) {
        require(_treasuryWallet != address(0), "ERR_INVALID_TREASURY");
        require(_playToken != address(0), "ERR_INVALID_TOKEN");
        treasuryWallet = _treasuryWallet;
        playToken = IPlayToken(_playToken);
    }

    /**
     * @dev Simple, cost-effective pseudo-random generator for Hedera.
     *      Uses timestamp, block number, player address and nonce.
     */
    function _generateRandomValue(address player) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.number, 
            player, 
            totalGamesPlayed
        )));
    }

    /**
     * @notice Play game (Dice sum 2-12 or Coin Flip). 30% win rate.
     */
    function play(uint8 gameType, uint8 prediction) external payable nonReentrant {
        require(msg.value >= 1e8, "ERR_MIN_WAGER_1HBAR"); 
        require(gameType == 1 || gameType == 2, "ERR_INVALID_GAMETYPE");

        totalGamesPlayed++;

        // Add to registry if first time
        if (!hasPlayed[msg.sender]) {
            playerIndex.push(msg.sender);
            hasPlayed[msg.sender] = true;
        }

        uint256 randValue = _generateRandomValue(msg.sender);
        bool won = false;
        uint256 hbarPayout = 0;
        uint256 rollResult = 0;

        if (gameType == 1) {
            // DICE GAME
            uint256 die1 = (randValue % 6) + 1;
            uint256 die2 = ((randValue / 10) % 6) + 1;
            rollResult = die1 + die2;

            // 30% win logic
            uint256 winChance = ((randValue >> 128) % 100) + 1;
            if (winChance <= 30) won = true;

            if (won) hbarPayout = (prediction == 2) ? msg.value * 4 : msg.value * 2;
        } else {
            // COIN FLIP
            require(prediction == 1 || prediction == 2, "ERR_INVALID_PREDICTION_COIN");
            rollResult = (randValue % 100) + 1;
            if (prediction == 1 && rollResult <= 30) won = true; 
            else if (prediction == 2 && rollResult >= 71) won = true;
            
            if (won) hbarPayout = msg.value * 2;
        }

        uint256 xpEarned = 0;
        uint256 playReward = 0;

        if (won) {
            if (hbarPayout > address(this).balance) hbarPayout = address(this).balance;
            (bool success, ) = payable(msg.sender).call{value: hbarPayout}("");
            require(success, "ERR_PAYOUT_TRANSFER_FAILED");
            
            xpEarned = (msg.value / 1e8) * 500;
            playReward = xpEarned * PLAY_DECIMALS; // 500 PLAY per HBAR
        } else {
            uint256 treasuryFee = (msg.value * 5) / 100;
            if (treasuryFee > 0) {
                (bool success, ) = payable(treasuryWallet).call{value: treasuryFee}("");
                require(success, "ERR_TREASURY_TRANSFER_FAILED");
            }
            
            xpEarned = (msg.value / 1e8) * 200;
            playReward = xpEarned * PLAY_DECIMALS; // 200 PLAY per HBAR
        }

        playerXP[msg.sender] += xpEarned;
        
        // Award $PLAY tokens (requires this contract to be a Minter on PlayToken)
        try playToken.rewardPlayer(msg.sender, playReward, won) {} catch {}
        
        emit XPAwarded(msg.sender, xpEarned);
        emit GameResult(msg.sender, gameType, prediction, msg.value, won, hbarPayout, xpEarned, rollResult);
    }

    /**
     * @notice Get total player count for leaderboard sizing.
     */
    function getPlayerCount() external view returns (uint256) {
        return playerIndex.length;
    }

    // ── Admin Functions ──────────────────────────────────────────────────────

    function setPlayToken(address _newPlayToken) external onlyOwner {
        require(_newPlayToken != address(0), "ERR_INVALID_TOKEN");
        playToken = IPlayToken(_newPlayToken);
        emit PlayTokenUpdated(_newPlayToken);
    }

    function setTreasuryWallet(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "ERR_INVALID_NEW_TREASURY");
        treasuryWallet = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }

    function withdrawHBAR(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "ERR_INSUFFICIENT_BANKROLL");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "ERR_WITHDRAW_FAILED");
    }

    function fundBankroll() external payable {}
    receive() external payable {}
    fallback() external payable {}
}
