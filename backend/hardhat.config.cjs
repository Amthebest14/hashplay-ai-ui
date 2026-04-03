require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: OPERATOR_KEY ? [OPERATOR_KEY] : []
    },
    hederaMainnet: {
      url: "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: OPERATOR_KEY ? [OPERATOR_KEY] : []
    }
  }
};
