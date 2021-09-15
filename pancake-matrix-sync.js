const { ethers } = require('ethers');
const fs = require('fs');

const providerUrl = require('./providers');

const matrix = require('./matrix');

const abi = require('./abis');
const address = require('./addresses');
const tokens = require('./tokens');

const sync = async (type) => {
  const provider = new ethers.providers.JsonRpcProvider(providerUrl[type]);
  const factory = new ethers.Contract(address.pancake.factory, abi.factory, provider);
  const bases = Object.keys(matrix[type]);
  await bases.reduce(async (pr, base) => {
    await pr;
    const quotes = Object.keys(matrix[type][base]);
    await quotes.reduce(async (pr1, quote) => {
      await pr1;
      if (type === 'baby') {
        return;
      }
      try {
        if (!matrix[type][base]) {
          matrix[type][base] = {};
        }
        if (!matrix[type][quote]) {
          matrix[type][quote] = {};
        }
        try {
          if (!tokens[base]) {
            const t = new ethers.Contract(base, abi.erc20, provider);
            tokens[base] = {
              address: base,
              symbol: await t.symbol(),
              name: await t.name(),
              decimals: await t.decimals(),
            };

            const supply = await t.totalSupply();
            tokens[base].supplyR = ethers.utils.formatUnits(supply, parseInt(`${tokens[base].decimals}`, 10));
          }
        } catch (e) {
          console.log(`${base} error ${e.message}`);
        }
        try {
          if (!tokens[quote]) {
            const t = new ethers.Contract(quote, abi.erc20, provider);
            tokens[quote] = {
              address: quote,
              symbol: await t.symbol(),
              name: await t.name(),

              decimals: await t.decimals(),
            };
            const supply = await t.totalSupply();
            tokens[quote].supplyR = ethers.utils.formatUnits(supply, parseInt(`${tokens[quote].decimals}`, 10));
          }
        } catch (e) {
          console.log(`${quote} error ${e.message}`);
        }

        if (!matrix[type][base][quote] && type !== 'baby') {
          const pair = await factory.getPair(base, quote);
          if (pair != ethers.constants.AddressZero && type !== 'baby') {
            matrix[type][base][quote] = {
              pair, reverse: false,
            };
            matrix[type][quote][base] = {
              pair, reverse: true,
            };
            console.log(`SYNCED pancake|${type} ${(tokens[base] || {}).symbol}->${(tokens[quote] || {}).symbol}`);
          } else {
            console.log(`NOT pancake|${type} ${(tokens[base] || {}).symbol}->${(tokens[quote] || {}).symbol}`);
          }
        } else {
          console.log(`OK pancake|${type} ${(tokens[base] || {}).symbol}->${(tokens[quote] || {}).symbol}`);
        }
      } catch (e) {
        console.log(`FAILED? pancake|${type} ${base}->${quote}: ${e.message}`);
      }
      return null;
    }, Promise.resolve(null));
    return null;
  }, Promise.resolve(null));
};

sync('ape');
// sync('baby');
sync('mdex');
sync('biswap');

setInterval(() => {
  console.log('writing');
  fs.writeFileSync('./matrix/pancake.json', JSON.stringify(matrix.pancake, null, 2));
  fs.writeFileSync('./tokens.json', JSON.stringify(tokens, null, 2));
}, 5000);
