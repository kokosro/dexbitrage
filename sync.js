const { ethers } = require('ethers');
const fs = require('fs');

const providerUrl = require('./providers');

const indexStart = {
  pancake: 10672,
  //  ape: 18,

};

const abi = require('./abis');
const address = require('./addresses');

const tokens = require('./tokens');

const tokenContracts = {};
const getAllPairs = async (type) => {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl[type]);
  console.log(`factory ${type} address: ${address[type].factory}`);

  const matrix = fs.existsSync(`./matrix/${type}.json`) ? require(`./matrix/${type}`) : {};
  const factory = new ethers.Contract(address[type].factory, abi.factory, provider);
  const totalPairs = await factory.allPairsLength();
  const n = parseInt(`${totalPairs}`);
  if (!indexStart[type]) { console.log(`${type} already done`); return; }
  for (let i = indexStart[type] || 0; i < totalPairs; i++) {
    try {
      const pairAddress = await factory.allPairs(i);
      const pair = new ethers.Contract(pairAddress, abi.pair, provider);
      const token0 = await pair.token0();
      const token1 = await pair.token1();
      if (!matrix[token0]) {
        matrix[token0] = {};
      }
      if (!matrix[token1]) {
        matrix[token1] = {};
      }

      matrix[token0][token1] = { pair: pairAddress, reverse: false };
      matrix[token1][token0] = { pair: pairAddress, reverse: true };
      if (!tokens[token0]) {
        const t = new ethers.Contract(token0, abi.erc20, provider);
        tokens[token0] = {
          address: token0,
          symbol: await t.symbol(),
          name: await t.name(),
          decimals: await t.decimals(),
        };
        tokenContracts[token0] = t;
        const supply = await t.totalSupply();
        tokens[token0].supplyR = ethers.utils.formatUnits(supply, parseInt(`${tokens[token0].decimals}`, 10));
      }
      if (!tokens[token1]) {
        const t = new ethers.Contract(token1, abi.erc20, provider);
        tokens[token1] = {
          address: token1,
          symbol: await t.symbol(),
          name: await t.name(),

          decimals: await t.decimals(),
        };
        const supply = await t.totalSupply();
        tokens[token1].supplyR = ethers.utils.formatUnits(supply, parseInt(`${tokens[token1].decimals}`, 10));
        tokenContracts[token1] = t;
      }
      console.log(`${type}(${i}/${n}) ${tokens[token0].symbol}:${tokens[token0].name} -> ${tokens[token1].symbol}:${tokens[token1].name}`);
      fs.writeFileSync(`./matrix/${type}.json`, JSON.stringify(matrix, null, 2));
    } catch (e) {

    }
  }
  console.log(`${type} sync DONE`);
};

setInterval(() => {
  fs.writeFileSync('./tokens.json', JSON.stringify(tokens, null, 2));
}, 5000);

getAllPairs('ape');
getAllPairs('pancake');
getAllPairs('biswap');
getAllPairs('mdex');
getAllPairs('baby');
