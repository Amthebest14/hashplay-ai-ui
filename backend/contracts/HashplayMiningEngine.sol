// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HashplayMiningEngine
 * @dev Handles the 16% mining logic for the Hashplay AI Arena.
 * Note: For production on Hedera, a PRNG service or oracle is recommended
 * instead of pseudo-randomness via block variables.
 */
contract HashplayMiningEngine is Ownable, ReentrancyGuard {
    IERC20 public hashplayToken;
    
    // Fee configurations
    uint256 public constant WIN_PAYOUT_PERCENTAGE = 116; // 116% payout (user gets wager + 16% profit)
    uint256 public treasuryFeePercentage = 5; // 5% fee on losses
    address public treasuryWallet;

    // Game stats
    uint256 public totalGamesPlayed;
    uint256 public totalTokensPaidOut;

    event GamePlayed(address indexed player, uint256 wager, bool won, uint256 payout);
    event TreasuryFeeUpdated(uint256 newFeePercentage);
    event TreasuryWalletUpdated(address newTreasury);

    constructor(address _tokenAddress, address _treasuryWallet) Ownable(msg.sender) {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_treasuryWallet != address(0), "Invalid treasury address");
        
        hashplayToken = IERC20(_tokenAddress);
        treasuryWallet = _treasuryWallet;
    }

    /**
     * @dev Core mining engine function to play a game.
     * The player must have approved this contract to spend their `wager`.
     */
    function playGame(uint256 wager) external nonReentrant {
        require(wager > 0, "Wager must be greater than 0");
        require(hashplayToken.balanceOf(msg.sender) >= wager, "Insufficient token balance");

        // Transfer player's wager to this contract temporarily
        // Requires prior approval: token.approve(contractAddress, wager)
        require(hashplayToken.transferFrom(msg.sender, address(this), wager), "Wager transfer failed");

        // Simple Randomness (Not secure for production - consider VRF/Oracles or Hedera PRNG for mainnet)
        bool won = _determineOutcome(msg.sender);

        uint256 payout = 0;

        if (won) {
            // Player won: Calculate 116% payout
            payout = (wager * WIN_PAYOUT_PERCENTAGE) / 100;
            
            // Ensure the contract has enough treasury funds to pay out the winnings
            require(hashplayToken.balanceOf(address(this)) >= payout, "Insufficient contract liquidity");

            // Pay the player
            require(hashplayToken.transfer(msg.sender, payout), "Payout transfer failed");
            totalTokensPaidOut += (payout - wager); // Track net inflation/payout
        } else {
            // Player lost. Route fee to treasury, keep remainder in contract as liquidity
            uint256 fee = (wager * treasuryFeePercentage) / 100;
            if (fee > 0) {
                require(hashplayToken.transfer(treasuryWallet, fee), "Fee transfer failed");
            }
        }

        totalGamesPlayed++;
        emit GamePlayed(msg.sender, wager, won, payout);
    }

    /**
     * @dev Simple pseudo-random outcome generator.
     * Approx 50% win rate.
     */
    function _determineOutcome(address player) private view returns (bool) {
        uint256 randomValue = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, player, totalGamesPlayed)));
        return (randomValue % 100) >= 50; // 50% chance to win
    }

    // --- Admin Functions ---

    function setTreasuryFeePercentage(uint256 _newFee) external onlyOwner {
        require(_newFee <= 20, "Fee too high"); // Max 20%
        treasuryFeePercentage = _newFee;
        emit TreasuryFeeUpdated(_newFee);
    }

    function setTreasuryWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid address");
        treasuryWallet = _newWallet;
        emit TreasuryWalletUpdated(_newWallet);
    }

    /**
     * @dev Allows the owner to fund the contract bankroll
     */
    function fundBankroll(uint256 amount) external onlyOwner {
        require(hashplayToken.transferFrom(msg.sender, address(this), amount), "Funding failed");
    }

    /**
     * @dev Allows the owner to withdraw excess funds from the contract
     */
    function withdrawBankroll(uint256 amount) external onlyOwner {
        require(hashplayToken.balanceOf(address(this)) >= amount, "Insufficient funds");
        require(hashplayToken.transfer(owner(), amount), "Withdrawal failed");
    }
}
