require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

const OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;
const DEPLOY_KEY   = process.env.DEPLOY_KEY;

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
      accounts: process.env.HEDERA_OPERATOR_KEY ? [process.env.HEDERA_OPERATOR_KEY] : []
    }
  },
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: {
      hederaMainnet: "no-api-key-needed"
    },
    customChains: [
      {
        network: "hederaMainnet",
        chainId: 295,
        urls: {
          apiURL: "https://server-verify.hashscan.io",
          browserURL: "https://hashscan.io"
        }
      }
    ]
  }
};
