const hre = require('hardhat');
const common = require('../common');

module.exports = async (contractName, options) => {
  console.log(`Checking ${contractName} for deployment`);
  if (!common.hasSavedContract(contractName)) {
    console.log(`${contractName} does not exist, deploying`);
    const Contract = await hre.ethers.getContractFactory(contractName, { libraries: options.libraries || {} });
    const gasPrice = await common.getGasPrice();

    const contractp = Contract.deploy(
      ...(options.args || []),
      {
        ...gasPrice,
      },
    );
    const contractT = await common.waiter.wait(`deploying ${contractName} contract `, contractp);
    const contract = await contractT.deployed();
    await common.saveContractData(contractName, { address: contractT.address });

    //    await common.waiter.wait(`saving migration step ${options.step}`, common.setCurrentStep(options.migrations ? options.migrations : contract, options.step));
  }
  const contractData = common.savedContractData(contractName);
  const contract = await hre.ethers.getContractAt(
    contractData.abi,
    contractData.address,
    await hre.ethers.getSigner(),
  );
  return contract;
};
