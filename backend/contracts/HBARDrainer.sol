// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @notice Helper to drain HBAR from old HashplayGame contracts.
 * On Hedera, payable(addr).transfer() between contracts is blocked.
 * Instead, we use the Hedera IExchangeRate precompile at 0x168
 * (cryptoTransfer) or simply a low-level call with value.
 * 
 * The trick: The calling contract initiates a .call{value: amount}("") 
 * which works for contract->EOA but not contract->contract on Hedera.
 * 
 * REAL SOLUTION: Use the actual Hedera CryptoTransfer precompile (address 0x16c).
 * Its IHederaTokenService selector for transferHBAR is different.
 * 
 * Alternatively, use sendTo which works on Hedera via low-level call:
 */
contract HBARDrainer {
    address payable public treasury;
    
    constructor(address payable _treasury) {
        treasury = _treasury;
    }
    
    // Called by the old contract via its withdrawHBAR after sending to this address  
    receive() external payable {
        treasury.call{value: address(this).balance}("");
    }
    
    fallback() external payable {
        treasury.call{value: address(this).balance}("");
    }
}
