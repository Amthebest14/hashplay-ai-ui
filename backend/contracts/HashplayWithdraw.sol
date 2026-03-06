// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HashplayWithdraw
 * @notice A replacement contract with corrected HBAR withdrawal using Hedera precompile.
 * This contract mimics HashplayGame but fixes the withdrawHBAR function
 * by using a low-level call instead of payable().transfer().
 * 
 * On Hedera, native transfers via the Hedera precompile at 0x16c work correctly.
 * See: https://docs.hedera.com/hedera/core-concepts/smart-contracts/system-smart-contracts
 */
contract HashplayWithdraw {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Withdraw HBAR to the owner using a low-level call.
     * Hedera blocks payable().transfer() in contracts, but a 
     * low-level .call{value: amount}("") to an EOA works correctly.
     */
    function withdrawAllHBAR() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No HBAR to withdraw");
        (bool success, ) = payable(owner).call{value: bal}("");
        require(success, "Transfer failed");
    }

    receive() external payable {}
    fallback() external payable {}
}
