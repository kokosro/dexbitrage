const ethers = require('ethers');
const Watcher = require('./watcher');

const tokens = [

  // '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  /*
  '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
  '0x23396cf899ca06c4472205fc903bdb4de249d6fc',
  '0xe9e7cea3dedca5984780bafc599bd69add087d56',
  '0x6e0bef56b648b3eebae3808b8cbe7efe8755ad9c',
  '0xf2e00684457de1a3c87361bc4bfe2de92342306c',
  '0x4a824ee819955a7d769e03fe36f9e0c3bd3aa60b',
  '0xce5814efff15d53efd8025b9f2006d4d7d640b9b',
  '0x580de58c1bd593a43dadcf0a739d504621817c05',
  '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
  '0x55d398326f99059ff775485246999027b3197955',
  '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
  '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  '0xba2ae424d960c26247dd6c32edc70b295c744c43',
  */
  // '0x55d398326f99059fF775485246999027B3197955',
  '0x23396cf899ca06c4472205fc903bdb4de249d6fc',
  '0xe9e7cea3dedca5984780bafc599bd69add087d56',
];

const routerAddress = '';
// START MAIN FUNCTION
const runBot = async () => {
  const watcher = new Watcher({
    providers: [
      'https://bsc-dataseed.binance.org/',
      'https://bsc-dataseed1.defibit.io/',
    ],
    fee: ethers.utils.parseUnits('0.0025', 4),
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  });
  await watcher.init();
  for (let i = 0; i < tokens.length; i++) {
    await watcher.addToken(tokens[i]);
  }
  const amount = ethers.utils.parseUnits(process.argv[2] || '1', 18);
  /*
  setInterval(async () => {
    const routerEstimation = await watcher.routerEstimate(amount,
      '0x23396cf899ca06c4472205fc903bdb4de249d6fc',
      '0xe9e7cea3dedca5984780bafc599bd69add087d56');
    console.log(`BUSD/UST R:${ethers.utils.formatUnits(routerEstimation, 18)}`);
  }, 5000);
*/
  setInterval(() => {
    const watcherEstimation = watcher.estimate(amount,
      '0x23396cf899ca06c4472205fc903bdb4de249d6fc',
      '0xe9e7cea3dedca5984780bafc599bd69add087d56');
    const R_watcherEstimation = watcher.estimate(amount,

      '0xe9e7cea3dedca5984780bafc599bd69add087d56',
      '0x23396cf899ca06c4472205fc903bdb4de249d6fc');

    console.log(`BUSD/UST W:${ethers.utils.formatUnits(watcherEstimation, 18)} | ${ethers.utils.formatUnits(R_watcherEstimation, 18)}`);
    /*
    const best = watcher.estimateBest(amount,
      '0x23396cf899ca06c4472205fc903bdb4de249d6fc',
      '0xe9e7cea3dedca5984780bafc599bd69add087d56');

    console.log(`${amount} ${best.path.join(',')} ${best.result}`);
*/
  }, 5000);
};

// Run bot
runBot().then(() => {
  console.log('Bot started!');
}).catch((error) => {
  console.log(error.message);
});
