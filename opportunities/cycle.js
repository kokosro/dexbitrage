const { ethers } = require('ethers');

/*
  asset
  pair ( connection between two assets ( base - quote ) )
  exchange - price of transformation between base and quote

  startAsset is the asset we start with and we want to get back to with a higher value
     we will loop through all possible start nodes
  startValue - amount of startAsset

  prices[base][quote][exchange] = price ( resulting quote value from base: baseAmount * price = quoteAmount )

  value = 1
  choose a base

  if(base is the starting base and value is higher than starting value) -> opportunity

  if current try cycle > a set value -> done, no opportunities, should move on

  loop through all possible quotes
    quote, pick exchange with highest price
    results a quoteAmount -> becoming base
    for each possible quote for new base
       pick exchange with highest price
          the base->quote / quote->base should have not be used previously on this exchange
       if no exchange available
          no-opportunity
       repeat with new base

  opportunities should be gathered in an array
  only filter best opportunities for each asset

  ops = []

  pickExchange(prices, base, quote, used)
    exchangeKeys.filterAnyAlreadyUsedFor(base, quote)
    return maxPriceExchange from all exchangeKeys;

  for base in bases
     baseValue=1;
     ops = ops.concat(constructOpportunities(startAsset:base, startValue:startValue, cycle=0, prices, base:base, value:baseValue, chain=[])

--------
   constructOpportunities(startAsset, startValue, cycle, prices, base, value, chain, used)

     if(startAsset == base && cycle > 1 && value > startValue) return [chain, value-startValue];

     if(cycle > MAX_CYCLES) return [];

     cycle += 1;

     for quote in prices[base]
         useExchange = pickExchange(prices, base, quote, used);
         resultAmount = prices[base][quote][useExchange] * value;
         used[base][quote][useExchange] = 1;
         opportunity = constructoOpportunities(startAsset, startValue, cycle, prices, quote, resultAmount, chain.concat([ base, useExchange, quote ], used));

*/

const MAX_CYCLES = 3;

const pickBestExchange = (prices, base, quote, used, startedFrom) => {
  const possibleExchanges = Object.keys(prices[base][quote]).filter((exchange) => {
    if (used[base] && used[base][quote] && used[base][quote][exchange]) {
      return false;
    }
    if (used[quote] && used[quote][base] && used[quote][base][exchange]) {
      return false;
    }
    return true;
  });
  if (possibleExchanges.length === 0) return null;
  let bestPrice;
  let bestExchange;
  for (const exIndex in possibleExchanges) {
    const ex = possibleExchanges[exIndex];
    if (!bestPrice) {
      bestPrice = prices[base][quote][ex];
      bestExchange = ex;
    } else if (bestPrice.lt(prices[base][quote][ex])) {
      bestExchange = ex;
      bestPrice = prices[base][quote][ex];
    }
  }
  // if (['pancake'].includes(bestExchange)) {
  return bestExchange;
  //  }
  return null;
};

const markUsed = (base, quote, exchange, used) => {
  const wasUsed = JSON.parse(JSON.stringify(used));
  if (!wasUsed[base]) {
    wasUsed[base] = {};
  }
  if (!wasUsed[quote]) {
    wasUsed[quote] = {};
  }
  if (!wasUsed[base][quote]) {
    wasUsed[base][quote] = {};
  }
  if (!wasUsed[quote][base]) {
    wasUsed[quote][base] = {};
  }

  wasUsed[base][quote][exchange] = Date.now();
  wasUsed[quote][base][exchange] = Date.now();
  return wasUsed;
};

const constructOpportunities = ({
  start, cycle, prices, current, chain, used, tokens,
  foundOps,
}) => {
  const chainSymbols = chain.map((x) => {
    if (!tokens[x]) return x;
    return tokens[x].symbol;
  });
  //  console.log(`level${cycle} from ${tokens[start.asset].symbol} ${chainSymbols.join('->')}`);

  if (start.asset == current.asset
     && cycle > 1
  ) {
    if (start.value.lt(current.value)) {
      //   console.log(`level${cycle} OP from ${tokens[start.asset].symbol} ${chainSymbols.join('->')} ${ethers.utils.formatUnits(current.value.sub(start.value), tokens[start.asset].decimals)}`);
      foundOps.push([chain, current.value.sub(start.value)]);
      return null;
    }
    return null;
  }
  if (cycle > MAX_CYCLES) {
    //    console.log(`level${cycle} DROPMAX from ${tokens[start.asset].symbol} ${chainSymbols.join('->')}`);
    return null;
  }
  let quotes = [];
  try {
    quotes = Object.keys(prices[current.asset]);
  } catch (e) {

  }
  //  let foundOps = [];
  for (const quoteIndex in quotes) {
    const quote = quotes[quoteIndex];
    const exchange = pickBestExchange(prices, current.asset, quote, used, start.asset);
    if (!exchange) {
      //      console.log(`level${cycle} DROPEX from ${tokens[start.asset].symbol} ${chainSymbols.join('->')}`);
      return null;
    }
    const price = prices[current.asset][quote][exchange];
    const nextValue = current.value.mul(price).div(ethers.BigNumber.from(10).pow(tokens[current.asset].decimals)).mul(9950).div(10000);
    let wasUsed = JSON.parse(JSON.stringify(used));
    if (cycle > 0) {
      wasUsed = markUsed(current.asset, quote, exchange, used);
    }
    // console.log(`level${cycle} ${ethers.utils.formatUnits(start.value, tokens[start.asset].decimals)} from ${tokens[start.asset].symbol} ${chainSymbols.join('->')}->${exchange}->${tokens[quote].symbol} ${ethers.utils.formatUnits(nextValue, tokens[quote].decimals)}`);
    const ops = constructOpportunities({
      start,
      cycle: cycle + 1,
      prices,
      current: { asset: quote, value: nextValue },
      used: wasUsed,
      chain: chain.concat([exchange, quote]),
      tokens,
      foundOps,
    });
    if (ops && ops.length > 0) {
      // console.log(ops);
      //   console.log(`level${cycle} from ${tokens[start.asset].symbol} ${chainSymbols.join('->')} OPS ${ops.length} ${tokens[quote].symbol}`);
      //    foundOps = foundOps.concat(ops);
    }
  }
  // if (foundOps.length > 0) {
  // console.log(`found OPS ${foundOps.length}`);
  // return foundOps;
  // }
  return null;
};

const build = ({
  universe, tokens, cycles = 3, bases,
}) => {
  const prices = universe.byAsset;
  //  const bases = Object.keys(prices);
  const opportunities = [];
  for (const baseIndex in bases) {
    const base = bases[baseIndex];
    if (tokens[base]) {
      const start = {
        asset: base,
        value: ethers.BigNumber.from(10).pow(tokens[base].decimals),
      };
      const current = {
        asset: base,
        value: ethers.BigNumber.from(10).pow(tokens[base].decimals),
      };
      console.log(`level0 building ops from ${tokens[base].symbol}`);
      const ops = [];
      constructOpportunities({
        start,
        cycle: 0,
        prices,
        current,
        chain: [base],
        used: {},
        tokens,
        foundOps: ops,
      });
      if (ops && ops.length > 0) {
      //  console.log(JSON.stringify(ops, null, 2));
        // process.exit(1);
        const best = ops.reduce((r, [chain, value]) => {
          if (!r) {
            return [chain, value];
          }
          if (r[1].lt(value)) {
            return [chain, value];
          }
          if (r[1].lte(value) && r[0].length > chain.length) {
            return [chain, value];
          }
          return r;
        }, null);
        console.log(`BEST opportunity ${tokens[base].symbol} profit: ${ethers.utils.formatUnits(best[1], tokens[base].decimals)} chain: ${best[0].map((x) => (tokens[x] ? tokens[x].symbol : x)).join('->')}`);
        opportunities.push(best);
      } else {
        console.log(`no ops from ${tokens[base].symbol}`);
      }
    }
  }
  return opportunities;
};

module.exports = build;
