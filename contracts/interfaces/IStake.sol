//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
interface IStake {
  function canVote(address voter_) external view returns (bool);
}
