// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const WETH = '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23';

async function main() {
  const owner = await hre.ethers.getSigner();
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(WETH);
  await escrow.connect(owner).deployed();

  console.log("Escrow deployed to:", escrow.address);

  const factoryAddress = '0xca143ce32fe78f1f7019d7d551a6402fc5350c73';

  const Router = await hre.ethers.getContractFactory("Router");
  const router = await Router.deploy(factoryAddress, WETH, escrow.address);
  await router.connect(owner).deployed();

  console.log("Router deployed to:", router.address);

  await escrow.connect(owner).setRouter(router.address);

  console.log("Set escrow's router to new router");
}

async function v2() {
  const owner = await hre.ethers.getSigner();

  console.log('Owner address', owner.address);
  
  const Aggregator = await ethers.getContractFactory("Aggregator");
  const aggregator = await Aggregator.deploy(WETH);
  await aggregator.connect(owner).deployed();

  console.log('Aggregator address', aggregator.address);

  const Router = await ethers.getContractFactory("RouterV2");
  const router = await Router.deploy(WETH, aggregator.address);
  await router.connect(owner).deployed();

  console.log('Router address', router.address);

  await aggregator.connect(owner).setRouter(router.address);
}

v2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
