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

const getBestBridge = (bridgesMap) => {
  let bestN = ethers.BigNumber.from(0);
  let bridgeKey;
  const bridges = Object.keys(bridgesMap);
  for (const bridge in bridges) {
    if (bestN.lt(bridgesMap[bridge])) {
      bridgeKey = bridge;
      bestN = ethers.BigNumber.from(bridgesMap[bridgeKey]);
    }
  }
  return bridgeKey;
};

const getOpportunities = (hops, usedBridges, {
  startToken, prices, cycles, tokens, startAmount,
}) => {
  const currentHop = startToken;

  hops.push(currentHop);
  const nextPossibleHops = Object.keys(prices[startToken]);
  let currentHopAmount = startAmount;
  for (const possibleHop in nextPossibleHops) {
    const bestBridge = getBestBridge(prices[startToken][possibleHop]);
    if (bestBridge) {
      usedBridges.push(bestBridge);
      currentHopAmount = currentHopAmount.mul(prices[startToken][possibleHop][bestBridge]);
    }
  }
};

const build = ({ universe, tokens, cycles = 3 }) => {
  const exchanges = Object.keys(universe);
  const bases = Object.keys(universe.byAsset);
  const opportunities = bases.map((startToken) => {
    const startAmount = ethers.BigNumber.from('10').pow(tokens[startToken].decimals);
    return getOpportunities([], [], {
      startToken,
      prices: universe.byAsset,
      cycles: 5,
      tokens,
      startAmount,
    });
  });
  return opportunities;
};
