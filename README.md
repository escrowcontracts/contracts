# EscrowContracts

Smart contracts are under development and are not yet available for production use.

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
