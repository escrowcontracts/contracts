//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./libraries/Signature.sol";

import "./abstracts/DisputableEscrow.sol";

contract Escrow is DisputableEscrow {
  using SafeMath for uint256;
  
  event Created (Contract contract_);
  event Accepted (Contract contract_);
  event Cancelled (Contract contract_);
  event Finished (Contract contract_);
  event Updated (Contract contract_, uint256 amount_, uint256 duration_, uint256 threshold_);

  constructor(address weth_) {
    WETH = weth_;
  }
  // If caller is buyer then the money is deposited
  // If caller is seller then the buyer needs to accept and once he accepts, the money will be deposited
  function create (
    bytes32 hash_,
    address buyer_,
    address seller_,
    address currency_,
    uint256 amount_,
    uint256 duration_,
    uint256 threshold_
  ) public payable checkHash(hash_, false) {

    Contract memory _contract = Contract(
      hash_,
      buyer_,
      seller_,
      currency_,
      0,
      amount_, 
      duration_,
      threshold_,
      Status.Pending,
      Info(
        msg.sender,
        address(0),
        block.timestamp,
        0,
        0,
        0
      )
    );

    _authorize(_contract);
    _contract.balance = _contract.balance.add(
      _depositIfBuyer(_contract)
    );
    _contract.info.createdBy = msg.sender;
    
    contracts[hash_] = _contract;
    hashCheck[hash_] = true;
    
    emit Created(_contract);
  }
  
  // Buyer can create and activate a contract with the signature of seller
  function createWithSignature (
    bytes32 hash_,
    address buyer_,
    address seller_,
    address currency_,
    uint256 amount_,
    uint256 duration_,
    uint256 threshold_,
    uint8 v_, 
    bytes32 r_, 
    bytes32 s_
  ) external payable {
    require(msg.sender == buyer_, "Create: Only buyer can create and activate");

    address _signer = Signature.getSigner(
      abi.encodePacked("ACTIVATE", Strings.toString(amount_), Strings.toString(duration_), Strings.toString(threshold_)),
      hash_,
      v_,
      r_,
      s_
    );

    require(_signer == seller_, "Cancel: Invalid signature");
    
    Contract storage _contract = contracts[hash_];
    create(hash_, buyer_, seller_, currency_, amount_, duration_, threshold_);
    _contract.status = Status.Active;
    _contract.info.startedAt = block.timestamp;
    emit Accepted(_contract);
  }

  function accept (
    bytes32 hash_
  ) external payable checkHash(hash_, true) {
    Contract storage _contract = contracts[hash_];
    
    _authorize(_contract);
    _contract.balance = _contract.balance.add(
      _depositIfBuyer(_contract)
    );
    _contract.status = Status.Active;
    _contract.info.startedAt = block.timestamp;

    emit Accepted(_contract);
  }

  function cancel (
    bytes32 hash_
  ) external checkHash(hash_, true) {
    Contract storage _contract = contracts[hash_];
    
    _authorize(_contract);
    require(_contract.status == Status.Pending, "Cancel: Contract is already accepted");
    _refund(_contract);
    
    _contract.balance = 0;
    _contract.status = Status.Cancelled;
    _contract.info.endedBy = msg.sender;
    _contract.info.endedAt = block.timestamp;

    emit Cancelled(_contract);
  }

  // Cancel when both parties agree
  function cancelWithSignature (
    bytes32 hash_,
    uint8 v_, 
    bytes32 r_, 
    bytes32 s_
  ) external checkHash(hash_, true) {
    Contract storage _contract = contracts[hash_];
    require(_contract.status == Status.Active, "Contract is not active");

    address _signer = Signature.getSigner(
      "CANCEL",
      hash_,
      v_,
      r_,
      s_
    );

    require(
      (_signer == _contract.buyer && msg.sender == _contract.seller) ||
      (_signer == _contract.seller && msg.sender == _contract.buyer),
      "Cancel: Invalid signature"
    );

    _refund(_contract);
    _contract.balance = 0;
    _contract.status = Status.Cancelled;
    _contract.info.endedBy = msg.sender;
    _contract.info.endedAt = block.timestamp;

    emit Cancelled(_contract);
  }

  function finish (
    bytes32 hash_
  ) external checkHash(hash_, true) {
    Contract storage _contract = contracts[hash_];
    require(_contract.status == Status.Active, "Finish: Contract is not active");

    _authorize(_contract);

    if (_contract.seller == msg.sender) {
      // seller can finish if buyer doesn't reply in threshold time
      uint256 _deadline = _contract.info.startedAt + _contract.duration + _contract.threshold;
      require(block.timestamp > _deadline, "Finish: Can't finish until buyer approve or deadline is passed");
    }

    _finish(_contract);
    _contract.balance = 0;
    _contract.status = Status.Finished;
    _contract.info.endedBy = msg.sender;
    _contract.info.endedAt = block.timestamp;

    emit Finished(_contract);
  }

  function dispute (
    bytes32 hash_,
    DisputeType type_
  ) external checkHash(hash_, true) {
    Contract storage _contract = contracts[hash_];
    require(_contract.status == Status.Active, "Dispute: Contract is not active");
    require(_contract.buyer == msg.sender, "Dispute: Only buyer can dispute");

    _dispute(_contract, type_);
    _contract.balance = 0;
    _contract.status = Status.Disputed;
    _contract.info.disputedAt = block.timestamp;
    emit Disputed(_contract, type_);
  }

  function updateWithSignature (
    bytes32 hash_,
    uint256 amount_,
    uint256 duration_,
    uint256 threshold_,
    uint8 v_, 
    bytes32 r_, 
    bytes32 s_
  ) external payable checkHash(hash_, true) {
    Contract storage _contract = contracts[hash_];
    require(
      _contract.status == Status.Pending || 
      _contract.status == Status.Active, 
      "Update: Can only update before finished"
    );

    address _signer = Signature.getSigner(
      abi.encodePacked("UPDATE", Strings.toString(amount_), Strings.toString(duration_), Strings.toString(threshold_)),
      hash_,
      v_,
      r_,
      s_
    );
    require(
      (_signer == _contract.buyer && msg.sender == _contract.seller) ||
      (_signer == _contract.seller && msg.sender == _contract.buyer),
      "Update: Invalid signature"
    );
    
    emit Updated(_contract, amount_, duration_, threshold_);
  
    uint256 _previousAmount = _contract.amount;
    _contract.amount = amount_;
    _contract.duration = duration_;
    _contract.threshold = threshold_;

    
    if (_previousAmount < amount_) {
      // if amount is changed, only buyer can call this function
      require(msg.sender == _contract.buyer, "Update: To change amount, only buyer can call this function");
      _contract.balance = _contract.balance.add(
        _deposit(_contract)
      );
    } else if (_previousAmount < amount_) {
      // refund rest amount to seller
      _refundRest(_contract);
      _contract.balance = amount_;
    }
  }
}
