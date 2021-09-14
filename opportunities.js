const { ethers } = require('ethers');
const fs = require('fs');
const { NonceManager } = require('@ethersproject/experimental');
const providerUrl = require('./providers');
const dexbitrageInfo = require('./migrated-live/Dexbitrage');
const matrix = require('./matrix');

const abi = require('./abis');
const address = require('./addresses');
const tokens = require('./tokens');

const prices = require('./prices');

const privateKeyMainnet = fs.readFileSync('.mainnet').toString().trim();
const tc = {};
let weth;
let ap;
const exchange = Object.entries(providerUrl).reduce((r, [t, url]) => {
  const provider = new ethers.providers.JsonRpcProvider(url);
  const factory = new ethers.Contract(address[t].factory, abi.factory, provider);
  const router = new ethers.Contract(address[t].router, abi.router, provider);
  if (!weth) {
    weth = new ethers.Contract('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', abi.erc20, provider);
    ap = provider;
  }
  return {
    ...r,
    [t]: { provider, factory, router },
  };
}, {});

const signer = new NonceManager(new ethers.Wallet(privateKeyMainnet, exchange.pancake.provider));
const dexbitrage = new ethers.Contract(dexbitrageInfo.address, dexbitrageInfo.abi, signer);
const wethAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

const check = async () => {
  const wethBalance = await dexbitrage.balance(wethAddress);
  const exchangeKeys = Object.keys(providerUrl);

  const priceMap = await prices.universe({
    matrix, tokens, exchangeKeys, exchange,
  });
  console.log(priceMap);

  setTimeout(() => {
    check();
  }, 60000);
};

check(process.argv[2] || 'ape');
