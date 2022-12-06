//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./BasicEscrow.sol";
import "../interfaces/IDispute.sol";

contract DisputableEscrow is BasicEscrow {
  enum DisputeType {Public, Judge, Private}

  event Disputed (Contract contract_, DisputeType type_);
  event DisputeHandlerUpdated (DisputeType type_, address disputeHandler_);

  mapping(bytes32 => address) public contractDisputes;

  mapping(DisputeType => address) public disputeHandlers;

  function _dispute(Contract memory contract_, DisputeType type_) internal {
    _verifyWithdraw(contract_);
    _withdraw(contract_.currency, disputeHandlers[type_], contract_.amount);
    
    IDispute(disputeHandlers[type_]).create(
      contract_.hash, 
      contract_.buyer, 
      contract_.seller, 
      contract_.currency, 
      contract_.amount
    );
  }

  function setDisputeContract(DisputeType type_, address disputeHandler_) external onlyOwner {
    disputeHandlers[type_] = disputeHandler_;
    emit DisputeHandlerUpdated(type_, disputeHandler_);
  }
}
