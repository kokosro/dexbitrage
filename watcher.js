const { ethers } = require('ethers');
const Graph = require('node-dijkstra');
const abis = require('./abis2');

const maxPercentage = ethers.utils.parseUnits('1', 4);
const asPercentage = (v) => ethers.utils.parseUnits(v, 4);
const zero = ethers.BigNumber.from('0');
class Watcher {
  constructor({
    providers,
    factory,
    fee,
    router,
  } = {
    providers: [
      'https://bsc-dataseed.binance.org/',
      'https://bsc-dataseed1.defibit.io/',
    ],

    fee: asPercentage('0.0025'),
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  }) {
    this.routerAddress = router;
    this.providerEvents = // new ethers.providers.WebSocketProvider('wss://bsc-ws-node.nariox.org:443');
      new ethers.providers.JsonRpcProvider(providers[0]);
    this.providerQueries = new ethers.providers.JsonRpcProvider(providers[1]);
    this.fee = fee;
    this.tokens = [];
    this.tokenPair = {};
    this.pair = {};
    this.pairs = [];
  }

  async init() {
    this.router = new ethers.Contract(this.routerAddress, abis.router, this.providerQueries);
    const factoryAddress = await this.router.factory();
    this.factory = new ethers.Contract(factoryAddress, abis.factory, this.providerQueries);
  }

  async addToken(token) {
    if (this.tokens.includes(token.toLowerCase())) {
      return null;
    }
    this.tokens.push(token.toLowerCase());
    if (this.tokens.length > 1) {
      await this.createListenersForPossiblePairs(token.toLowerCase());
      return true;
    }

    return false;
  }

  async createListenersForPossiblePairs(token) {
    for (let i = 0; i < this.tokens.length; i++) {
      if (this.tokens[i] !== token) {
        const possiblePairAddress = (await this.factory.getPair(token, this.tokens[i])).toLowerCase();
        if (possiblePairAddress !== ethers.constants.AddressZero
            && !this.pair[possiblePairAddress]) {
          console.log(`initiating pair ${possiblePairAddress} t0: ${token} t1: ${this.tokens[i]}`);
          this.pair[possiblePairAddress] = {
            contract: new ethers.Contract(possiblePairAddress, abis.pair, this.providerEvents),
          };
          const token0 = (await this.pair[possiblePairAddress].contract.token0()).toLowerCase();
          const token1 = (await this.pair[possiblePairAddress].contract.token1()).toLowerCase();
          const [reserve0, reserve1] = await this.pair[possiblePairAddress].contract.getReserves();

          this.pair[possiblePairAddress].token0 = token0;
          this.pair[possiblePairAddress].token1 = token1;
          if (!this.tokenPair[token0]) {
            this.tokenPair[token0] = {};
          }
          if (!this.tokenPair[token1]) {
            this.tokenPair[token1] = {};
          }
          this.tokenPair[token0][token1] = {
            pair: possiblePairAddress, reserve0, reserve1, block: 0, index: 0,
          };
          this.tokenPair[token1][token0] = {
            pair: possiblePairAddress, reserve0, reserve1, block: 0, index: 0, reverse: true,
          };

          this.pairs.push(possiblePairAddress);
          this.startSyncListener(possiblePairAddress);
        }
      }
    }
  }

  async routerEstimate(amount, fromToken, toToken) {
    const [, receiveAmount] = await this.router.getAmountsOut(amount, [fromToken, toToken]);
    return receiveAmount;
  }

  estimateBest(amount, fromTokenRaw, toTokenRaw) {
    const fromToken = fromTokenRaw.toLowerCase();
    const toToken = toTokenRaw.toLowerCase();
    const sGraph = new Graph();

    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      const tokenEdges = Object.keys(this.tokenPair[token]).reduce((r, tokenE) => {
        const v = parseFloat(`${ethers.utils.formatUnits(this.estimate(ethers.utils.parseUnits('1', 18), token, tokenE), 18)}`);
        if (v > 0) {
          return {
            ...r,
            [tokenE]: 1 / v,
          };
        }
        return r;
      }, {});
      sGraph.addNode(token, tokenEdges);
    }
    const bestPath = sGraph.path(fromToken, toToken);
    return { path: bestPath, result: this.estimate(amount, bestPath) };
  }

  estimate(amount, fromTokenRaw, toTokenRaw) {
    if (Array.isArray(fromTokenRaw)) {
      let result = amount;
      for (let i = 0; i < fromTokenRaw.length - 1; i++) {
        result = this.estimate(result, fromTokenRaw[i], fromTokenRaw[i + 1]);
      }
      return result;
    }
    const fromToken = fromTokenRaw.toLowerCase();
    const toToken = toTokenRaw.toLowerCase();
    if (this.tokenPair[fromToken] && this.tokenPair[fromToken][toToken]) {
      const { reserve0, reserve1, reverse } = this.tokenPair[fromToken][toToken];
      //      console.log(`r0 ${reserve0} r1: ${reserve1} ${reverse}`);
      let price;
      if (!reverse) {
        const amountInWithFee = amount.mul(maxPercentage.sub(this.fee));
        const numerator = amountInWithFee.mul(reserve1);
        const denominator = reserve0.mul(maxPercentage).add(amountInWithFee);
        price = numerator.div(denominator);
        if (price.gte(reserve1)) {
          price = zero;
        }
      } else {
        const amountInWithFee = amount.mul(maxPercentage.sub(this.fee));
        const numerator = amountInWithFee.mul(reserve0);
        const denominator = reserve1.mul(maxPercentage).add(amountInWithFee);
        price = numerator.div(denominator);
        if (price.gte(reserve0)) {
          price = zero;
        }
      }
      return price;
    }
    return zero;
  }

  updatePairReserves({
    pair, reserve0, reserve1, block, index,
  }) {
    const { token0, token1 } = this.pair[pair];
    if (!this.tokenPair[token0]) {
      this.tokenPair[token0] = {};
    }
    if (!this.tokenPair[token1]) {
      this.tokenPair[token1] = {};
    }
    if (!this.tokenPair[token0][token1]) {
      this.tokenPair[token0][token1] = {
        pair, reserve0, reserve1, block, index,
      };
      this.tokenPair[token1][token0] = {
        pair, reserve0, reserve1, block, index, reverse: true,
      };
    } else if (this.tokenPair[token0][token1].block < block
          || (this.tokenPair[token0][token1].block == block && this.tokenPair[token0][token1].index < index)) {
      this.tokenPair[token0][token1].reserve0 = reserve0;
      this.tokenPair[token0][token1].reserve1 = reserve1;
      this.tokenPair[token0][token1].block = block;
      this.tokenPair[token0][token1].index = index;

      this.tokenPair[token1][token0].reserve0 = reserve0;
      this.tokenPair[token1][token0].reserve1 = reserve1;
      this.tokenPair[token1][token0].block = block;
      this.tokenPair[token1][token0].index = index;
    }
  }

  startSyncListener(pair) {
    const listener = (reserve0, reserve1, info) => {
      if (!info.removed) {
        this.updatePairReserves({
          pair, reserve0, reserve1, block: info.blockNumber, index: info.transactionIndex,
        });
      } else {
        console.log('REMOVED');
      }
    };
    this.pair[pair].contract.on('Sync', listener.bind(this));
  }
}

module.exports = Watcher;
