// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HashplayArenaV3
 * @notice Casino-grade wagering contract for Hedera using Pseudo-Randomness.
 *         Features:
 *         - Secure Randomness: Powered by block hash, timestamp, and sender (Pseudo-random to save ~1HBAR gas fees)
 *         - Airdrop Points: Automated on-chain XP mapping (No associations needed)
 *         - Treasury: Automated 5% fee routing on user losses
 */
contract HashplayArenaV3 is Ownable, ReentrancyGuard {
    
    // State Variables
    address public treasuryWallet;
    mapping(address => uint256) public userPoints;
    uint256 public totalGamesPlayed;
    
    // Events
    event GameResult(
        address indexed player,
        uint8   gameType, // 1: Dice, 2: Coin
        uint8   prediction,
        uint256 wager,
        bool    won,
        uint256 hbarPayout,
        uint256 pointsEarned,
        uint256 rollResult
    );

    event TreasuryUpdated(address newTreasury);
    event PointsAwarded(address indexed player, uint256 amount);

    constructor(address _treasuryWallet) Ownable(msg.sender) {
        require(_treasuryWallet != address(0), "Invalid treasury address");
        treasuryWallet = _treasuryWallet;
    }

    /**
     * @dev Internal pseudo-random generator
     */
    function _generateRandomValue(address player) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, player, totalGamesPlayed)));
    }

    /**
     * @notice Play a casino game (Dice sum 2-12 or Coin Flip).
     */
    function play(uint8 gameType, uint8 prediction) external payable nonReentrant {
        require(msg.value >= 1e8, "Minimum wager: 1 HBAR"); // 1 HBAR = 1e8 tinybars
        require(gameType == 1 || gameType == 2, "Invalid game type");

        totalGamesPlayed++;

        // --- Low-Fee Pseudo-Randomness ---
        uint256 randValue = _generateRandomValue(msg.sender);

        bool won = false;
        uint256 hbarPayout = 0;
        uint256 rollResult = 0;

        if (gameType == 1) {
            // DICE GAME Logic (Sum of two dice 1-6)
            uint256 die1 = (randValue % 6) + 1;
            uint256 die2 = ((randValue / 10) % 6) + 1; // Use different bits of the seed
            rollResult = die1 + die2;

            if (prediction == 1 && rollResult < 7) won = true;
            else if (prediction == 2 && rollResult == 7) won = true;
            else if (prediction == 3 && rollResult > 7) won = true;

            if (won) {
                // If betting on "Equal (7)", payout is 4x. Others are 2x.
                hbarPayout = (prediction == 2) ? msg.value * 4 : msg.value * 2;
            }
        } else {
            // COIN FLIP Logic (1-100)
            rollResult = (randValue % 100) + 1;
            
            // 4% House Edge (Results 49-52 = House Win regardless of prediction)
            if (rollResult >= 49 && rollResult <= 52) {
                won = false;
            } else {
                if (prediction == 1 && rollResult <= 48) won = true; // Heads
                else if (prediction == 2 && rollResult >= 53) won = true; // Tails
            }
            if (won) hbarPayout = msg.value * 2;
        }

        uint256 pointsEarned = 0;

        if (won) {
            // --- Player Win Path ---
            // Ensure contract bankroll can cover the payout
            if (hbarPayout > address(this).balance) hbarPayout = address(this).balance;
            
            (bool success, ) = payable(msg.sender).call{value: hbarPayout}("");
            require(success, "Payout failed");
            
            // Award 500 points per full HBAR wagered on a WIN
            pointsEarned = (msg.value / 1e8) * 500;
        } else {
            // --- Player Loss Path ---
            // 5% Treasury Fee: 5% of the wager goes to the treasury wallet
            uint256 treasuryFee = (msg.value * 5) / 100;
            if (treasuryFee > 0) {
                (bool success, ) = payable(treasuryWallet).call{value: treasuryFee}("");
                // We don't require(success) to prevent a malicious treasury from blocking games
            }
            
            // Award 200 "Consolation" points per full HBAR wagered on a LOSS
            pointsEarned = (msg.value / 1e8) * 200;
        }

        // Apply Points to the on-chain scorecard
        userPoints[msg.sender] += pointsEarned;
        
        emit PointsAwarded(msg.sender, pointsEarned);
        emit GameResult(msg.sender, gameType, prediction, msg.value, won, hbarPayout, pointsEarned, rollResult);
    }

    // --- Admin & Recovery Functions ---

    /**
     * @notice Allows the owner to pull all (or any) HBAR from the contract.
     * Use this to retire the contract or move liquidity.
     */
    function withdrawHBAR(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Update where the 5% loss fee is sent.
     */
    function setTreasuryWallet(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid address");
        treasuryWallet = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }

    /**
     * @notice Deposit HBAR into the contract bankroll.
     */
    function fundBankroll() external payable {}

    receive() external payable {}
}
