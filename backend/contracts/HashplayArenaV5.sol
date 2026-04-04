// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HashplayArenaV5 — Optimized For Hedera
 * @notice Casino wagering contract with integrated on-chain XP system.
 *         Features:
 *         - No HTS: Pure on-chain XP mapping
 *         - Optimized Gas: Removed block.prevrandao for better estimation
 *         - Automated Treasury: 5% fee on losses
 *         - On-Chain Scorecard: Tracks and ranks top players
 */
contract HashplayArenaV5 is Ownable, ReentrancyGuard {
    
    // State Variables
    address public treasuryWallet;
    mapping(address => uint256) public playerXP;
    uint256 public totalGamesPlayed;
    
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

    constructor(address _treasuryWallet) Ownable(msg.sender) {
        require(_treasuryWallet != address(0), "Invalid treasury address");
        treasuryWallet = _treasuryWallet;
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
        require(msg.value >= 1e8, "Min: 1 HBAR"); // 1 HBAR = 10^8 tinybars on Hedera EVM ledger
        require(gameType == 1 || gameType == 2, "Invalid game");

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
            rollResult = (randValue % 100) + 1;
            if (prediction == 1 && rollResult <= 30) won = true; 
            else if (prediction == 2 && rollResult >= 71) won = true;
            
            if (won) hbarPayout = msg.value * 2;
        }

        uint256 xpEarned = 0;

        if (won) {
            if (hbarPayout > address(this).balance) hbarPayout = address(this).balance;
            (bool success, ) = payable(msg.sender).call{value: hbarPayout}("");
            require(success, "Payout failed");
            xpEarned = (msg.value / 1e8) * 500;
        } else {
            uint256 treasuryFee = (msg.value * 5) / 100;
            if (treasuryFee > 0) {
                (bool success, ) = payable(treasuryWallet).call{value: treasuryFee}("");
                // No require to avoid blocking games
            }
            xpEarned = (msg.value / 1e8) * 200;
        }

        playerXP[msg.sender] += xpEarned;
        
        emit XPAwarded(msg.sender, xpEarned);
        emit GameResult(msg.sender, gameType, prediction, msg.value, won, hbarPayout, xpEarned, rollResult);
    }

    /**
     * @notice Get total player count for leaderboard sizing.
     */
    function getPlayerCount() external view returns (uint256) {
        return playerIndex.length;
    }

    /**
     * @notice Allows owner to pull HBAR (legacy/admin).
     */
    function withdrawHBAR(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Failed");
    }

    function setTreasuryWallet(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid");
        treasuryWallet = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }

    function fundBankroll() external payable {}
    receive() external payable {}
}
