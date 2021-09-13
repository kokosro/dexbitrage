const { ethers } = require('ethers');
const fs = require('fs');

const providerUrl = require('./providers');

const matrix = require('./matrix');

const abi = require('./abis');
const address = require('./addresses');
const tokens = require('./tokens');

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

const getPriceMap = async () => {
  console.log(`${(new Date()).toISOString()} refreshing priceMap`);
  const prices = await Object.keys(matrix.common).reduce(async (pr, base) => {
    const r = await pr;
    const pm = await Object.keys(matrix.common[base]).reduce(async (pqr, quote) => {
      const qr = await pqr;
      const exes = await Promise.all(Object.keys(providerUrl).map(async (ex) => {
        if (!matrix[ex] || !matrix[ex][base] || !matrix[ex][base][quote]) {
          return [ex, ethers.BigNumber.from('0')];
        }
        try {
          const result = await exchange[ex].router.getAmountsOut(ethers.utils.parseUnits('1', tokens[base].decimals), [base, quote]);
          return [ex, result[1]];
        } catch (e) {
          return [ex, ethers.BigNumber.from('0')];
        }
      }));
      return {
        ...qr,
        [quote]: exes.reduce((er, [ex, unitPrice]) => ({ ...er, [ex]: unitPrice }), qr[quote] || {}),
      };
    }, r[base] || {});
    return {
      ...r,
      [base]: pm,
    };
  }, Promise.resolve({}));
  console.log(`${(new Date()).toISOString()} priceMap refreshed`);
  return prices;
};

const check = async () => {
  const allExchanges = Object.keys(providerUrl);

  const priceMap = await getPriceMap();
  // console.log(priceMap);
  allExchanges.forEach((startExchange) => {
    const otherExchanges = Object.keys(providerUrl).filter((x) => x !== startExchange);
    Object.keys(matrix.common).reduce((r, base) => {
      const startAmount = ethers.utils.parseUnits('1', tokens[base].decimals);
      return Object.keys(matrix.common[base]).reduce((pr1, quote) => {
        const baseSymbol = tokens[base].symbol;
        const quoteSymbol = tokens[quote].symbol;
        // console.log(`${base} ${quote}`);
        let entry;

        entry = priceMap[base][quote][startExchange];
        if (!entry) return null;
        let rev;
        const beep = '';
        const revs = otherExchanges.map((ex) => {
          if (priceMap[quote][base][ex]) {
            rev = entry.mul(priceMap[quote][base][ex]).div(ethers.BigNumber.from(10).pow(tokens[base].decimals));
            return [ex, rev];
          }
          return [ex, ethers.BigNumber.from('0')];
        });
        let best;
        for (let i = 0; i < revs.length; i++) {
        //        console.log(revs[i]);
          if (!best) {
            best = revs[i];
          } else if (revs[i][1].gt(best[1])) {
            best = revs[i];
          }
        }
        if (best) {
          if (best[1].gt(startAmount)) {
            if (best[1].sub(startAmount).mul(10000).div(startAmount).lt(2000)) {
              console.log(`\x07 OPPORTUNITY ${startExchange} ${baseSymbol} ${ethers.utils.formatUnits(startAmount, tokens[base].decimals)} -> ${best[0]} through ${quoteSymbol} -> ${baseSymbol} ${ethers.utils.formatUnits(best[1], tokens[base].decimals)}`);
            } else {
              //   console.log(`WRONG ${startExchange} ${baseSymbol} ${ethers.utils.formatUnits(startAmount, tokens[base].decimals)} -> ${best[0]} through ${quoteSymbol} -> ${baseSymbol} ${ethers.utils.formatUnits(best[1], tokens[base].decimals)}`);
            }
          } else {
            //   console.log(`${startExchange} ${baseSymbol} ${ethers.utils.formatUnits(startAmount, tokens[base].decimals)} -> ${best[0]} through ${quoteSymbol} -> ${baseSymbol} ${ethers.utils.formatUnits(best[1], tokens[base].decimals)}`);
          }
        } else {
          // console.log(`${startExchange} ${baseSymbol}->${quoteSymbol} no price`);
        }
        return null;
      // process.exit(1);
      }, null);
    }, null);
  });
  setTimeout(() => {
    check();
  }, 15000);
};

check(process.argv[2] || 'ape');
