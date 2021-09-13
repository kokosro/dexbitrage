const hre = require('hardhat');
const fs = require('fs');
const waiter = require('./waiter');

const getGasPrice = async () => {
  const currentGasPrice = await hre.ethers.provider.getGasPrice();
  let maxFeePerGas = hre.ethers.BigNumber.from(hre.config.gasPrice.maxGasPrice);
  let maxPriorityFeePerGas = hre.ethers.BigNumber.from(hre.config.gasPrice.maxPriorityFeePerGas);

  const block = await hre.ethers.provider.getBlock('latest');

  if (!block || !block.baseFeePerGas) {
    if (currentGasPrice.mul(12).div(10).gt(maxFeePerGas)) {
      console.log(`gasPrice: ${hre.ethers.utils.formatUnits(maxFeePerGas, 'gwei')} gwei ( type 0 )`);
      return {
        gasPrice: maxFeePerGas,
      };
    }
    console.log(`gasPrice: ${hre.ethers.utils.formatUnits(maxFeePerGas, 'gwei')} gwei ( typeo 0 )`);
    return {
      gasPrice: currentGasPrice.mul(102).div(100),
    };
  }
  if (currentGasPrice.lt(maxFeePerGas)) {
    maxFeePerGas = currentGasPrice.add(1000);
  }
  if (block.baseFeePerGas.gt(maxFeePerGas)) {
    maxFeePerGas = block.baseFeePerGas.mul(120).div(100).add(maxPriorityFeePerGas);
  }

  if (maxPriorityFeePerGas.gt(maxFeePerGas)) {
    maxPriorityFeePerGas = hre.ethers.BigNumber.from(1000000000);
  }
  console.log(`baseFeePerGas: ${hre.ethers.utils.formatUnits(block.baseFeePerGas, 'gwei')} gwei ( type 2 )`);
  console.log(`maxFeePerGas: ${hre.ethers.utils.formatUnits(maxFeePerGas, 'gwei')} gwei ( type 2 )`);
  console.log(`maxPriorityFeePerGas: ${hre.ethers.utils.formatUnits(maxPriorityFeePerGas, 'gwei')} gwei ( type 2 )`);
  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
};

const migratedPath = (contractName = '') => `${hre.config.paths.root}/${hre.config.paths.migrated}-${hre.network.name}${contractName !== '' ? '/' : ''}${contractName}${contractName !== '' ? '.json' : ''}`;

const forceDirectory = () => {
  const rootDir = `${hre.config.paths.root}/${hre.config.paths.migrated}-${hre.network.name}`;
  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir);
  }
};

const hasSavedContract = (contractName) => {
  forceDirectory();
  const p = migratedPath(contractName);
  return fs.existsSync(p);
};

const saveContractData = async (contractName, data) => {
  forceDirectory();
  const m = migratedPath(contractName);
  const artifactData = await hre.artifacts.readArtifact(contractName);
  fs.writeFileSync(m, JSON.stringify({
    ...data,
    abi: artifactData.abi,
  }));
};

const savedContractData = (contractName) => {
  forceDirectory();
  if (!hasSavedContract(contractName)) {
    return null;
  }
  const fileContent = fs.readFileSync(migratedPath(contractName), { encoding: 'utf8' });

  const x = JSON.parse(fileContent);
  return x;
};

const currentStep = async (migrationsContract) => {
  const c = await migrationsContract.lastCompletedMigration();
  return parseInt(`${c}`, 10);
};

const incCurrentStep = async (migrationsContract) => {
  let cs = await currentStep(migrationsContract);
  cs += 1;
  const tx = await migrationsContract.setCompleted(cs, {
    ...(await getGasPrice()),
  });

  return tx.wait();
};

const setCurrentStep = async (migrationsContract, step) => {
  const tx = await migrationsContract.setCompleted(step, {
    ...(await getGasPrice()),
  });
  return tx.wait();
};

const awaitTx = async (tx) => {
  if (tx.wait) {
    console.log(`waiting ${tx.hash}`);
    const r = await tx.wait();
    return r;
  }
  const p = await tx;
  console.log(`waiting2 ${p.hash}`);
  const r = await p.wait();
  return r;
};

module.exports = {
  getGasPrice,
  hasSavedContract,
  savedContractData,
  saveContractData,
  currentStep,
  incCurrentStep,
  setCurrentStep,
  waiter,
  awaitTx,
};
