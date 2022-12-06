//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
interface IDispute {
  function create (
    bytes32 hash_,
    address buyer_,
    address seller_,
    address currency_,
    uint256 amount_
  ) external;
}
