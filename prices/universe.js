const { ethers } = require('ethers');

const getPriceMap = async ({
  matrix, exchangeKeys, exchange, tokens,
}) => {
  console.log(`${(new Date()).toISOString()} refreshing priceMap`);
  const mapPrice = {};
  const prices = await Object.keys(matrix.common).reduce(async (pr, base) => {
    const r = await pr;
    const pm = await Object.keys(matrix.common[base]).reduce(async (pqr, quote) => {
      const qr = await pqr;
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
  console.log(`${(new Date()).toISOString()} priceMap refreshed`);
  return { byExchange: mapPrice, byAsset: prices };
};

module.exports = getPriceMap;
