
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract TestDecimals {
    event Received(uint256 msgValue, uint256 balance);
    
    function testBuy() external payable {
        emit Received(msg.value, address(this).balance);
    }
    
    function testSend(uint256 amount) external {
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Send failed");
    }
}
