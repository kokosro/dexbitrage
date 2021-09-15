const { ethers } = require('ethers');
const fs = require('fs');
const { NonceManager } = require('@ethersproject/experimental');
const providerUrl = require('./providers');
const dexbitrageInfo = require('./migrated-live/Dexbitrage');
const matrix = require('./matrix');

const abi = require('./abis');
const address = require('./addresses');
const tokens = require('./tokens');
const build = require('./opportunities/cycle');
const prices = require('./prices');

const privateKeyMainnet = fs.readFileSync('.mainnet').toString().trim();

const getGasPrice = async (provider) => {
  const currentGasPrice = await provider.getGasPrice();
  let maxFeePerGas = ethers.BigNumber.from('10000000000');
  let maxPriorityFeePerGas = ethers.BigNumber.from('1000000000');

  const block = await provider.getBlock('latest');

  if (!block || !block.baseFeePerGas) {
    if (currentGasPrice.mul(12).div(10).gt(maxFeePerGas)) {
      console.log(`gasPrice: ${ethers.utils.formatUnits(maxFeePerGas, 'gwei')} gwei ( type 0 )`);
      return {
        gasPrice: maxFeePerGas,
      };
    }
    console.log(`gasPrice: ${ethers.utils.formatUnits(maxFeePerGas, 'gwei')} gwei ( typeo 0 )`);
    return {
      gasPrice: currentGasPrice.mul(102).div(100),
    };
  }
  if (currentGasPrice.lt(maxFeePerGas)) {
    maxFeePerGas = currentGasPrice.add(1000);
  }
  if (block.baseFeePerGas.gt(maxFeePerGas)) {
    maxFeePerGas = block.baseFeePerGas.mul(120).div(100).add(maxPriorityFeePerGas);
  }

  if (maxPriorityFeePerGas.gt(maxFeePerGas)) {
    maxPriorityFeePerGas = ethers.BigNumber.from(1000000000);
  }
  console.log(`baseFeePerGas: ${ethers.utils.formatUnits(block.baseFeePerGas, 'gwei')} gwei ( type 2 )`);
  console.log(`maxFeePerGas: ${ethers.utils.formatUnits(maxFeePerGas, 'gwei')} gwei ( type 2 )`);
  console.log(`maxPriorityFeePerGas: ${ethers.utils.formatUnits(maxPriorityFeePerGas, 'gwei')} gwei ( type 2 )`);
  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
};
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

const withdraw = async () => {
  const bases = [
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
    '0x55d398326f99059fF775485246999027B3197955',
    '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
    '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  ];
  //  for (let i = 0; i < bases.length; i++) {
    // const token = new ethers.Contract(bases[i], abi.erc20, exchange.pancake.provider);
    // const x = await dexbitrage.offload(bases[i], 0);
    //    console.log(x.hash);
    //    await x.wait();
  //  }
  const balances = {};

  for (let i = 0; i < bases.length; i++) {
    console.log(bases[i]);

    const token = new ethers.Contract(bases[i], abi.erc20, signer);
    console.log('xxxx');
    tc[bases[i]] = token;
    balances[bases[i]] = await tc[bases[i]].balanceOf(await signer.getAddress());
    console.log(`${bases[i]} balance fetched`);
  }
  console.log(balances);
  const x = await Promise.all(bases.map((base) => tc[base].transfer(dexbitrageInfo.address, balances[base])));
  console.log(x.map((p) => console.log(p.hash)));
};

withdraw();
