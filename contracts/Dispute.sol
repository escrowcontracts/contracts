//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./libraries/Signature.sol";
import "./libraries/TransferHelper.sol";
import "./interfaces/IStake.sol";

contract Dispute is Ownable {
  using SafeMath for uint256;

  struct Contract {
    bytes32 hash;
    bytes32 signature;
    address buyer;
    address seller;
    address currency;
    uint256 amount;
    uint256 createdAt;
    uint256 resolvedAt;
    uint8 resolvedWith;
  }

  event Created (Contract contract_);
  event Resolved (Contract contract_, uint8 voteIndex_);

  uint256 public minVotesRequired = 3;
  address public WETH;
  address public escrow;
  address public stake;

  mapping(bytes32 => bool) public hasDispute;
  mapping(bytes32 => Contract) public contracts;
  mapping(bytes32 => mapping(uint8 => uint256)) votes; // S0B10, S1B9, S2B8 ... S10B0 (11 cases)

  constructor(address weth_) {
    WETH = weth_;
  }

  function setWETH(address weth_) external onlyOwner {
    WETH = weth_;
  }

  function setMinVotesRequired(uint256 minVotesRequired_) external onlyOwner {
    minVotesRequired = minVotesRequired_;
  }

  modifier onlyEscrow() {
    require(escrow == msg.sender, "Dispute: Invalid permission");
    _;
  }

  function setEscrow(address escrow_) external onlyOwner {
    escrow = escrow_;
  }

  function setStake(address stake_) external onlyOwner {
    stake = stake_;
  }

  function _authorize(Contract memory contract_) internal view {
    require(contract_.buyer == msg.sender || contract_.seller == msg.sender, "Auth: Invalid permission");
  }
  
  function create (
    bytes32 hash_,
    address buyer_,
    address seller_,
    address currency_,
    uint256 amount_
  ) external onlyEscrow {

    Contract memory _contract = Contract(
      hash_,
      "",
      buyer_,
      seller_,
      currency_,
      amount_, 
      block.timestamp,
      0,
      0
    );
    
    contracts[hash_] = _contract;
    hasDispute[hash_] = true;
    emit Created(_contract);
  }
  
  function _resolve(Contract memory contract_, uint8 vote_) internal {
    uint256 _sellerCut = vote_ * 10;
    require(_sellerCut <= 100, "Resolve: Invalid vote");
    uint256 _sellerAmount = contract_.amount * _sellerCut / 100;

    if (WETH == contract_.currency) {
      TransferHelper.safeTransferETH(
        contract_.seller,
        _sellerAmount
      );
      TransferHelper.safeTransferETH(
        contract_.buyer,
        contract_.amount.sub(_sellerAmount)
      );
    } else {
      TransferHelper.safeTransferFrom(
        contract_.currency, 
        address(this),
        contract_.seller, 
        _sellerAmount
      );
      TransferHelper.safeTransferFrom(
        contract_.currency, 
        address(this),
        contract_.buyer, 
        contract_.amount.sub(_sellerAmount)
      );
    }
  }

  function resolve (
    bytes32 hash_,
    address[] calldata voters_,
    uint8[] calldata votes_,
    uint8[] calldata vs_, 
    bytes32[] calldata rs_, 
    bytes32[] calldata ss_
  ) external {
    Contract storage _contract = contracts[hash_];
    _authorize(_contract);
    require(hasDispute[hash_], "Resolve: No active dispute");

    require(
      voters_.length == votes_.length && 
      voters_.length == vs_.length &&
      voters_.length == rs_.length &&
      voters_.length == ss_.length,
      "Resolve: Invalid parameters"
    );
    require(voters_.length >= minVotesRequired, "Resolve: Insufficient votes");

    for (uint i = 0; i < voters_.length; i++) {
      // TODO: check if the voter is eligable, no duplicate check
      address _signer = Signature.getSigner(
        abi.encodePacked("VOTE", Strings.toString(votes_[i]), Strings.toString(i)),
        _contract.hash,
        vs_[i],
        rs_[i],
        ss_[i]
      );
      require(_signer == voters_[i], "Resolve: Invalid signature");
      require(IStake(stake).canVote(_signer), "Resolve: Invalid voter");

      votes[_contract.hash][votes_[i]] += 1;
    }

    // TODO: check if max vote duplicates
    uint8 _vote = 0;
    for (uint8 i = 0; i < 11; i++) {
      if (votes[_contract.hash][_vote] < votes[_contract.hash][i]) {
        _vote = i;
      }
    }

    _resolve(_contract, _vote);
    _contract.resolvedAt = block.timestamp;
    _contract.resolvedWith = _vote;
    hasDispute[_contract.hash] = false;
    emit Resolved(_contract, _vote);
  }

  function resolveWithSignature (
    bytes32 hash_,
    uint8 vote_,
    uint8 v_, 
    bytes32 r_, 
    bytes32 s_
  ) external {
    Contract storage _contract = contracts[hash_];
    _authorize(_contract);
    require(hasDispute[hash_], "Resolve: No active dispute");

    address _signer = Signature.getSigner(
      abi.encodePacked("RESOLVE", Strings.toString(vote_)),
      hash_,
      v_,
      r_,
      s_
    );
    require(
      (_signer == _contract.buyer && msg.sender == _contract.seller) ||
      (_signer == _contract.seller && msg.sender == _contract.buyer),
      "Resolve: Invalid signature"
    );

    _resolve(_contract, vote_);
    _contract.resolvedWith = vote_;
    _contract.resolvedAt = block.timestamp;
    hasDispute[hash_] = false;
    emit Resolved(_contract, vote_);
  }

  receive() external payable {}
}
