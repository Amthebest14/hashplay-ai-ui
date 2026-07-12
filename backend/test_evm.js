const { ethers } = require("ethers");
const fs = require('fs');
require("dotenv").config({ path: "../.env" });

const contractSrc = `
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
`;

async function main() {
    fs.writeFileSync('./contracts/TestDecimals.sol', contractSrc);
    const { execSync } = require('child_process');
    execSync("npx hardhat compile", { stdio: 'inherit' });
    
    const provider = new ethers.JsonRpcProvider("https://mainnet.hashio.io/api");
    const wallet = new ethers.Wallet("0x" + process.env.HEDERA_OPERATOR_KEY, provider);
    
    const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/TestDecimals.sol/TestDecimals.json', 'utf8'));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    console.log("Deploying TestDecimals...");
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    
    console.log("Sending 1 HBAR to testBuy...");
    const tx = await contract.testBuy({ value: ethers.parseEther("1.0") });
    const receipt = await tx.wait();
    
    const event = receipt.logs.map(l => contract.interface.parseLog(l)).find(e => e.name === "Received");
    console.log("msg.value received:", event.args.msgValue.toString());
    console.log("address(this).balance:", event.args.balance.toString());
    
    console.log("Testing testSend with 1e8...");
    // If testSend(1e8) sends 1 HBAR, then .call{value} uses tinybars!
    const balBefore = await provider.getBalance(wallet.address);
    const tx2 = await contract.testSend(100000000n);
    const receipt2 = await tx2.wait();
    const balAfter = await provider.getBalance(wallet.address);
    
    console.log("Balance difference (Wei):", (balAfter - balBefore).toString());
}

main().catch(console.error);
