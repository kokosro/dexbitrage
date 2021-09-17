const fs = require('fs');
const path = require('path');
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
// const privateKeyRopsten = fs.readFileSync('.privatekey-ropsten').toString().trim();

const privateKeyMainnet = fs.readFileSync('.mainnet').toString().trim();

module.exports = {
  defaultNetwork: 'live',
  networks: {

    live: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: [privateKeyMainnet],
    },
  },
  solidity: {
    version: '0.8.3',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: './contracts',
    tests: './tests-hardhat',
    cache: './cache',
    artifacts: './artifacts',
    migrated: './migrated',
  },

  mocha: {
    timeout: 20000,
  },
  gasPrice: {
    maxGasPrice: 30000000000,
    maxPriorityFeePerGas: 2000000000,
  },
};
