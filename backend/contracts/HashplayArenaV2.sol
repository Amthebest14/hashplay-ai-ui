// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HashplayArenaV2
 * @notice Casino-grade wagering contract for Hedera Testnet.
 *         Features:
 *         - Dice: Statistically correct sum (2-12). 4x payout for "Equal (7)".
 *         - Coin Flip: 1-100 roll with 4% house edge (results 49-52 = House Win).
 */
contract HashplayArenaV2 is Ownable, ReentrancyGuard {
    address public hashplayToken;
    address constant HTS_PRECOMPILE = address(0x167);

    event GameResult(
        address indexed player,
        uint8   gameType, // 1: Dice, 2: Coin
        uint8   prediction,
        uint256 wager,
        bool    won,
        uint256 hbarPayout,
        uint256 hashplayReward,
        uint256 rollResult
    );

    constructor(address _hashplayToken) Ownable(msg.sender) {
        hashplayToken = _hashplayToken;
    }

    /**
     * @notice Play a casino game.
     */
    function play(uint8 gameType, uint8 prediction) external payable nonReentrant {
        require(msg.value > 0, "Wager must be > 0");
        require(gameType == 1 || gameType == 2, "Invalid game type");

        uint256 randSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            msg.value,
            gameType
        )));

        bool won = false;
        uint256 hbarPayout = 0;
        uint256 rollResult = 0;

        if (gameType == 1) {
            uint256 die1 = (randSeed % 6) + 1;
            uint256 die2 = ((randSeed / 10) % 6) + 1;
            rollResult = die1 + die2;

            if (prediction == 1 && rollResult < 7) won = true;
            else if (prediction == 2 && rollResult == 7) won = true;
            else if (prediction == 3 && rollResult > 7) won = true;

            if (won) {
                hbarPayout = (prediction == 2) ? msg.value * 4 : msg.value * 2;
            }
        } else {
            rollResult = (randSeed % 100) + 1;
            if (rollResult >= 49 && rollResult <= 52) {
                won = false;
            } else {
                if (prediction == 1 && rollResult <= 48) won = true;
                else if (prediction == 2 && rollResult >= 53) won = true;
            }
            if (won) hbarPayout = msg.value * 2;
        }

        uint256 hashplayReward = 0;
        if (won) {
            if (hbarPayout > address(this).balance) hbarPayout = address(this).balance;
            (bool success, ) = payable(msg.sender).call{value: hbarPayout}("");
            require(success, "HBAR payout failed");
            hashplayReward = msg.value * 500;
        } else {
            hashplayReward = msg.value * 200;
        }

        _sendHashplay(msg.sender, hashplayReward);
        emit GameResult(msg.sender, gameType, prediction, msg.value, won, hbarPayout, hashplayReward, rollResult);
    }

    function _sendHashplay(address to, uint256 amount) internal {
        if (amount == 0 || hashplayToken == address(0)) return;
        int64 htsAmount = int64(int256(amount));
        
        // Auto-associate
        HTS_PRECOMPILE.call(
            abi.encodeWithSignature("associateToken(address,address)", to, hashplayToken)
        );

        // Transfer
        HTS_PRECOMPILE.call(
            abi.encodeWithSignature(
                "transferToken(address,address,address,int64)",
                hashplayToken,
                address(this),
                to,
                htsAmount
            )
        );
    }

    function withdrawHBAR(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        int64 htsAmount = int64(int256(amount));
        (bool success, ) = HTS_PRECOMPILE.call(
            abi.encodeWithSignature(
                "transferToken(address,address,address,int64)",
                hashplayToken,
                address(this),
                owner(),
                htsAmount
            )
        );
        require(success, "Token withdrawal failed");
    }

    function updateToken(address _newToken) external onlyOwner {
        hashplayToken = _newToken;
    }

    function fundBankroll() external payable {}
    receive() external payable {}
}
