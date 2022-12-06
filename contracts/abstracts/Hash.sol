//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Hash {
  mapping(bytes32 => bool) public hashCheck;

  modifier checkHash(bytes32 hash_, bool isExist_) {
    require(hashCheck[hash_] == isExist_, "Invalid hash");
    _;
  }
}
