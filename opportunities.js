const { ethers } = require('ethers');
const fs = require('fs');

const providerUrl = require('./providers');

const matrix = require('./matrix');

const abi = require('./abis');
const address = require('./addresses');
const tokens = require('./tokens');

const tc = {};
const check = async () => {
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

  await Object.keys(matrix.common).reduce(async (pr, base) => {
    await pr;
    if (base !== '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c') {
      //      return null;
    }
    if (!tc[base]) {
      tc[base] = {
        contract: new ethers.Contract(base, abi.erc20, ap),
      };
    }

    const startAmount = ethers.utils.parseUnits('1', tokens[base].decimals);
    await Object.keys(matrix.common[base]).reduce(async (pr1, quote) => {
      await pr1;
      if (base !== '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
         && quote !== '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c') {
        // return null;
      }

      const baseSymbol = tokens[base].symbol;
      const quoteSymbol = tokens[quote].symbol;
      console.log(`${base} ${quote}`);
      let entry;
      try {
        entry = await exchange.pancake.router.getAmountsOut(startAmount, [base, quote]);
        console.log(baseSymbol, quoteSymbol);
        console.log(`pancacke ${baseSymbol}->${quoteSymbol} `, ethers.utils.formatUnits(entry[0], tokens[base].decimals), ethers.utils.formatUnits(entry[1], tokens[quote].decimals));
      } catch (e) {
        return null;
      }
      let rev;
      let beep = '';
      try {
        rev = await exchange.ape.router.getAmountsOut(entry[1], [quote, base]);
        if (rev[1].gt(startAmount)) {
          beep = '\x07 OPPORTUNITY: ';
        }
        console.log(`${beep}ape: ${quoteSymbol}->${baseSymbol}`, ethers.utils.formatUnits(rev[0], tokens[quote].decimals), ethers.utils.formatUnits(rev[1], tokens[base].decimals));
      } catch (e) {
        console.log('ape error');
      }
      beep = '';
      try {
        rev = await exchange.mdex.router.getAmountsOut(entry[1], [quote, base]);
        if (rev[1].gt(startAmount)) {
          beep = '\x07 OPPORTUNITY: ';
        }
        console.log(`${beep}mdex: ${quoteSymbol}->${baseSymbol}`, ethers.utils.formatUnits(rev[0], tokens[quote].decimals), ethers.utils.formatUnits(rev[1], tokens[base].decimals));
      } catch (e) {
        console.log('mdex error');
      }
      beep = '';
      try {
        rev = await exchange.baby.router.getAmountsOut(entry[1], [quote, base]);
        if (rev[1].gt(startAmount)) {
          beep = '\x07 OPPORTUNITY: ';
        }
        console.log(`${beep}baby: ${quoteSymbol}->${baseSymbol}`, ethers.utils.formatUnits(rev[0], tokens[quote].decimals), ethers.utils.formatUnits(rev[1], tokens[base].decimals));
      } catch (e) {
        console.log('baby error');
      }
      beep = '';
      try {
        rev = await exchange.biswap.router.getAmountsOut(entry[1], [quote, base]);
        if (rev[1].gt(startAmount)) {
          beep = '\x07 OPPORTUNITY: ';
        }
        console.log(`${beep}biswap: ${quoteSymbol}->${baseSymbol}`, ethers.utils.formatUnits(rev[0], tokens[quote].decimals), ethers.utils.formatUnits(rev[1], tokens[base].decimals));
      } catch (e) {
        console.log('biswap error');
      }
      beep = '';
      return null;
      // process.exit(1);
    }, Promise.resolve(null));
    return null;
  }, Promise.resolve(null));
  setTimeout(check, 15000);
};

check();
