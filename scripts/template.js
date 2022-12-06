// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const Bytecode = require('../constants/bytecode');
const Abi = require('../constants/abi');
const Utils = require('../test/utils/index').default;

async function main() {
  const owner = await hre.ethers.getSigner();

  const WETH = await ethers.getContractFactory(Abi.WETH, Bytecode.WETH);
  const weth = await WETH.deploy();
  await weth.deployed();

  console.log('WETH address', weth.address);

  const UniFactory = await ethers.getContractFactory(Abi.UNI_FACTORY, Bytecode.UNI_FACTORY);
  const uniFactory = await UniFactory.deploy(owner.address);
  await uniFactory.deployed();

  console.log('Factory address', uniFactory.address);

  const UniRouter = await ethers.getContractFactory(Abi.UNI_ROUTER, Bytecode.UNI_ROUTER);
  const uniRouter = await UniRouter.deploy(uniFactory.address, weth.address);
  await uniRouter.deployed();

  console.log('Uni-Router address', uniRouter.address);

  // Add Liquidity
  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy();
  await token.connect(owner).deployed();

  console.log('Token address', token.address);

  try {
    await uniFactory.createPair(weth.address, token.address);
  } catch(e) {
    // console.log('Pair exists');
  }

  const supply = BigInt(await token.totalSupply());

  await token.connect(owner).approve(uniRouter.address, Utils.hex(supply));
  await uniRouter.connect(owner).addLiquidityETH(
    token.address, 
    supply,
    0,
    0,
    owner.address,
    20000000000,
    { value: Utils.ether(3) }
  );

  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(weth.address);
  await escrow.connect(owner).deployed();

  console.log("Escrow deployed to:", escrow.address);

  const Router = await hre.ethers.getContractFactory("Router");
  const router = await Router.deploy(uniFactory.address, weth.address, escrow.address);
  await router.connect(owner).deployed();

  console.log("Router deployed to:", router.address);

  await escrow.connect(owner).setRouter(router.address);

  console.log("Set escrow's router to new router");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
