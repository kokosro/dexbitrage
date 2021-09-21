const { ethers } = require('ethers');

const isIgnored = (asset1, asset2, exchange) => [
//  '0xd7bf683cAd197f4f869678cdDC345b38B483d8E4',
  // '0x12e34cDf6A031a10FE241864c32fB03a4FDaD739',
//  '0x23396cF899Ca06c4472205fC903bDB4de249D6fC',
//  '0xacFC95585D80Ab62f67A14C566C1b7a49Fe91167',
//  '0x67d012F731c23F0313CEA1186d0121779c77fcFE',
//  '0x8850D2c68c632E3B258e612abAA8FadA7E6958E5',
  '0x8076C74C5e3F5852037F31Ff0093Eeb8c8ADd8D3',
//  '0xD7B729ef857Aa773f47D37088A1181bB3fbF0099',
//  '0xfeD2B9Ed4F3a6BAa02543A9DB86524dd790fCC65',
//  '0x7B0409A3A3f79bAa284035d48E1DFd581d7d7654',
].includes(asset1)
|| [
//  '0xd7bf683cAd197f4f869678cdDC345b38B483d8E4',
  // '0x12e34cDf6A031a10FE241864c32fB03a4FDaD739',
//  '0x23396cF899Ca06c4472205fC903bDB4de249D6fC',
//  '0xacFC95585D80Ab62f67A14C566C1b7a49Fe91167',
//  '0x67d012F731c23F0313CEA1186d0121779c77fcFE',
//  '0x8850D2c68c632E3B258e612abAA8FadA7E6958E5',
  '0x8076C74C5e3F5852037F31Ff0093Eeb8c8ADd8D3',
//  '0xD7B729ef857Aa773f47D37088A1181bB3fbF0099',
//  '0xfeD2B9Ed4F3a6BAa02543A9DB86524dd790fCC65',
//  '0x7B0409A3A3f79bAa284035d48E1DFd581d7d7654',
].includes(asset2)
      || ![
        'pancake',
        'ape',
        'mdex',
        'biswap',
        'baby',
      ].includes(exchange);

const getPriceMap = async ({
  matrix, exchangeKeys, exchange, tokens,
}) => {
  console.log(`${(new Date()).toISOString()} refreshing priceMap`);
  const startTime = Date.now();
  const mapPrice = {};

  const bases = Object.keys(matrix.common);
  const results = [];
  await Promise.all(bases.map(async (base) => {
    await Promise.all(Object.keys(matrix.common[base]).map(async (quote) => {
      await Promise.all(exchangeKeys.map(async (ex) => {
        if (isIgnored(base, quote, ex) || !matrix[ex] || !matrix[ex][base] || !matrix[ex][base][quote]

        ) {
          return;
        }
        try {
          const result = await exchange[ex].router.getAmountsOut(ethers.utils.parseUnits('1', tokens[base].decimals), [base, quote]);
          //   console.log(`${ex.padEnd(8, ' ')}\t${tokens[base].symbol.padEnd(8, ' ')}\t${tokens[quote].symbol.padEnd(8, ' ')}\t${ethers.utils.formatUnits(result[1], tokens[quote].decimals)}`);
          results.push([base, quote, ex, result[1]]);
        } catch (e) {

        }
      }));
    }));
  }));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const [base, quote, ex, price] = result;
    if (!mapPrice[base]) {
      mapPrice[base] = {};
    }
    if (!mapPrice[base][quote]) {
      mapPrice[base][quote] = {};
    }
    if (!mapPrice[base][quote][ex]) {
      mapPrice[base][quote][ex] = price;
    }
    mapPrice[base][quote][ex] = price;
  }

  /*
  const prices = await Object.keys(matrix.common).reduce(async (pr, base) => {
    const r = await pr;
    if (base == '0xacFC95585D80Ab62f67A14C566C1b7a49Fe91167') {
      return r;
    }
    const pm = await Object.keys(matrix.common[base]).reduce(async (pqr, quote) => {

      const qr = await pqr;
      if (quote == '0xacFC95585D80Ab62f67A14C566C1b7a49Fe91167') {
        return qr;
      }
      const exes = await Promise.all(exchangeKeys.map(async (ex) => {
        if (!matrix[ex] || !matrix[ex][base] || !matrix[ex][base][quote]) {
          return [ex, ethers.BigNumber.from('0')];
        }
        try {
          const result = await exchange[ex].router.getAmountsOut(ethers.utils.parseUnits('1', tokens[base].decimals), [base, quote]);
          console.log(`${ex.padEnd(8, ' ')}\t${tokens[base].symbol.padEnd(8, ' ')}\t${tokens[quote].symbol.padEnd(8, ' ')}\t${ethers.utils.formatUnits(result[1], tokens[quote].decimals)}`);
          if (!mapPrice[ex]) {
            mapPrice[ex] = {};
          }
          if (!mapPrice[ex][base]) {
            mapPrice[ex][base] = {};
          }
          mapPrice[ex][base][quote] = result[1];
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
*/
  const endTime = ((Date.now() - startTime) / 1000);
  console.log(`${(new Date()).toISOString()} priceMap refreshed ${endTime} seconds`);
  return { byExchange: mapPrice, byAsset: mapPrice };
};

module.exports = getPriceMap;
