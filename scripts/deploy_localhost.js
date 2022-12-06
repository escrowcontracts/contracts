// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const Bytecode = require('../constants/bytecode');
const Abi = require('../constants/abi');
const Utils = require('../test/utils/index').default;

async function main() {
  // Parameters
  const voteMinToken = 0; 

  const owner = await hre.ethers.getSigner();

  const WETH = await ethers.getContractFactory(Abi.WETH, Bytecode.WETH);
  const weth = await WETH.deploy();
  await weth.deployed();

  console.log('WETH address', weth.address);
  
  // Add Liquidity
  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy();
  await token.connect(owner).deployed();

  console.log('Token address', token.address);

  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(weth.address);
  await escrow.connect(owner).deployed();

  console.log('Escrow address', escrow.address);

  const Dispute = await ethers.getContractFactory("Dispute");
  const dispute = await Dispute.deploy(weth.address);
  await dispute.connect(owner).deployed();

  console.log('Dispute address', dispute.address);

  await dispute.connect(owner).setEscrow(escrow.address);
  await escrow.connect(owner).setDisputeContract(0, dispute.address);

  const Stake = await ethers.getContractFactory("Stake");
  const stake = await Stake.deploy();
  await stake.connect(owner).deployed();

  console.log('Stake address', stake.address);

  await stake.connect(owner).setToken(token.address);
  await stake.connect(owner).setVoteMinToken(voteMinToken);

  await dispute.connect(owner).setStake(stake.address);;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
