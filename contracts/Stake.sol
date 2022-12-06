//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./libraries/TransferHelper.sol";

contract Stake is Ownable {
  using SafeMath for uint256;

  mapping(address => uint256) public balanceOf;

  uint256 public voteMinToken;
  
  event Deposit (address from_, uint256 amount_);
  event Withdraw (address from_, address to_, uint256 amount_);

  address public token;
  constructor() {
  }

  function canVote(address voter_) external view returns (bool) {
    return balanceOf[voter_] >= voteMinToken;
  }

  function setVoteMinToken(uint256 voteMinToken_) external onlyOwner {
    voteMinToken = voteMinToken_;
  }

  function setToken(address token_) external onlyOwner {
    token = token_;
  }

  function deposit(uint256 amount_) external {
    TransferHelper.safeTransferFrom(
      token, 
      msg.sender,
      address(this), 
      amount_
    );

    balanceOf[msg.sender] += amount_;

    emit Deposit(msg.sender, amount_);
  }

  function withdraw(uint256 amount_, address to_) external {
    require(balanceOf[msg.sender] >= amount_, "Withdraw: Insufficient balance");

    balanceOf[msg.sender] -= amount_;

    TransferHelper.safeTransferFrom(
      token, 
      address(this), 
      to_,
      amount_
    );
    emit Withdraw(msg.sender, to_, amount_);
  }

  receive() external payable {}
}
