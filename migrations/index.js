const hre = require('hardhat');
const common = require('./common');
const deployers = require('./deployer');

async function main() {
  const blocksWaited = 0;
  const isWaiting = false;
  const waitDescription = '';
  await hre.run('compile');
  const dexbitrage = await deployers.contract('Dexbitrage', { step: 1 });
}

main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
