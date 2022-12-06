# Basic Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```

# Test
```
npx hardhat test
```
Or
```
npx hardhat test ./test/escrow
npx hardhat test ./test/router
```

# Deploy

## Main
```
npx hardhat run ./scripts/deploy_main.js --network main
```

## BSC Main
```
npx hardhat run ./scripts/deploy_bsc.js --network bsc
```

## CRO
```
npx hardhat run ./scripts/deploy_cro.js --network cro
```

## Rinkeby
```
npx hardhat run ./scripts/deploy_rinkeby.js --network rinkeby
```

## Ganache
```
npx hardhat run ./scripts/deploy_localhost.js --network localhost
```