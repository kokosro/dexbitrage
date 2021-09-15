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
  let maxFeePerGas = ethers.BigNumber.from('60000000000');
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
const wethAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

const check = async () => {
  const wethBalance = await dexbitrage.balance(wethAddress);
  if (wethBalance.lt(ethers.utils.parseUnits('0.1', 18))) {
    const load = await dexbitrage.loadETH({
      value: ethers.utils.parseUnits('0.1', 18).sub(wethBalance),
    });
    console.log(`loading wbnb: ${load.hash}`);
    await load.wait();
    console.log('loaded wbnb');
  }
  const exchangeKeys = Object.keys(providerUrl);

  const priceMap = await prices.universe({
    matrix, tokens, exchangeKeys, exchange,
  });
  //  console.log(priceMap);

  const canBeBases =
  /*
        (await (Promise.all(Object.keys(priceMap.byAsset).map(async (base) => {
    if (!tokens[base]) return null;
    const balance = await dexbitrage.balance(base);
    if (balance.isZero()) {
      return null;
    }
    return base;
  })))).filter((x) => !!x);
  */ [
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xE02dF9e3e622DeBdD69fb838bB799E3F168902c5',
      '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',

      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402',
      '0x55d398326f99059fF775485246999027B3197955',
      //      '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47',
      // '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
      // '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    ];
  const startAmounts = {
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c': ethers.BigNumber.from('174000780000000'),

  };

  const ops = build({ universe: priceMap, tokens, bases: canBeBases });
  // process.exit();
  /// const [firstOp] = ops;

  if (ops && ops.length > 0) {
    const useGasPrice = (await getGasPrice(exchange.pancake.provider));
    const txes = await (Promise.all(ops.slice(0, 1).map(([chain]) => {
      const { routers, path } = chain.reduce((r, x) => {
        if (tokens[x]) {
          return { routers: r.routers, path: r.path.concat([x]) };
        }
        if (address[x]) {
          return {
            routers: r.routers.concat([address[x].router]),
            path: r.path,
          };
        }
        console.log(`error ${x} unknown`);
        process.exit(1);
        return r;
      }, { routers: [], path: [] });
      console.log(`routers: ${routers.join(',')}
path: ${path.join(',')}`);
      const aTx = dexbitrage.bitrage(startAmounts[path[0]] || 0, routers, path, {
        ...useGasPrice,
        gasLimit: 1000000,
      });
      return aTx;
    // process.exit(0);
    })));
    const pushedTx = await Promise.all(txes);
    console.log(`pushedTxes: ${pushedTx.map((tx) => tx.hash).join(' , ')}`);
    try {
      const minedTx = await Promise.all(txes.map((tx) => tx.wait()));
      console.log(`minedTxes: ${minedTx.map((tx) => tx.hash).join(' , ')}`);
    } catch (e) {
      console.log(`failed TX ${e.message}`);
    }
    // process.exit(1);
  }

  setTimeout(() => {
    check();
  }, 45000);
};

check(process.argv[2] || 'ape');
