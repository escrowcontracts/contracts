require("@nomiclabs/hardhat-waffle");
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    rinkeby: {
      url: process.env.TEST_RPC,
      accounts: [process.env.TEST_PRIVATE_KEY]
    },
    main: {
      url: process.env.MAIN_RPC,
      accounts: [process.env.MAIN_PRIVATE_KEY]
    },
    bsc: {
      url: process.env.BSC_RPC,
      chainId: 56,
      // gasPrice: 20000000000,
      accounts: [process.env.BSC_MAIN_PRIVATE_KEY]
    },
    cro: {
      url: process.env.CRO_RPC,
      chainId: 25,
      // gasPrice: 20000000000,
      accounts: [process.env.CRO_PRIVATE_KEY]
    },
    localhost: {
      url: 'HTTP://127.0.0.1:7545',
      accounts: [process.env.LOCAL_PRIVATE_KEY]
    }
  },
};
