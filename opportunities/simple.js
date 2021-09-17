const { ethers } = require('ethers');

module.exports = ({
  priceMap, allExchanges, tokens, matrix,
}) => {
  allExchanges.forEach((startExchange) => {
    const otherExchanges = allExchanges.filter((x) => x !== startExchange);
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
};
