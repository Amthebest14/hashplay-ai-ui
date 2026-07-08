const { ethers } = require("ethers");

// Generate a fresh ECDSA deploy wallet
const wallet = ethers.Wallet.createRandom();
console.log("=== DEPLOY WALLET (one-time use) ===");
console.log("Address:     ", wallet.address);
console.log("Private Key: ", wallet.privateKey);
console.log("\nSend 70 HBAR to:", wallet.address);
console.log("(Hedera will auto-create the account on first receive)");
