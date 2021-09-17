const hre = require('hardhat');

class Waiter {
  constructor() {
    this.isWaiting = false;
    this.waitDescription = '';
    this.blocksWaited = 0;
    this.sleeper = null;
    this.sleepForBlocks = 0;
    this.sleepedBlocks = 0;
    hre.ethers.provider.on('block', this.onBlock.bind(this));
  }

  onBlock() {
    if (this.isWaiting) {
      this.blocksWaited += 1;
      console.log(`${this.waitDescription} waited ${this.blocksWaited} blocks`);
    }
    if (this.sleeper) {
      this.sleepedBlocks += 1;
      console.log(`sleeping blocks (${this.sleepedBlocks}) out of ${this.sleepForBlocks}`);
      if (this.sleepedBlocks >= this.sleepForBlocks) {
        this.sleeper();
        this.sleeper = null;
        this.sleepedBlocks = 0;
        this.sleepForBlocks = 0;
      }
    }
  }

  async wait(description, waitForTx) {
    this.waitDescription = description;
    this.isWaiting = true;
    const r = await waitForTx;
    this.isWaiting = false;

    console.log(`${description} waited for ${this.blocksWaited} blocks`);
    this.blocksWaited = 0;
    return r;
  }

  sleep(blocks) {
    return new Promise((resolve) => {
      this.sleepForBlocks = blocks;
      this.sleepedBlocks = 0;
      this.sleeper = resolve;
    });
  }
}

module.exports = new Waiter();
