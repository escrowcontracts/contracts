//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../libraries/TransferHelper.sol";
import "../abstracts/Hash.sol";

struct Info {
  address createdBy;
  address endedBy;
  uint256 createdAt;
  uint256 startedAt;
  uint256 endedAt;
  uint256 disputedAt;
}

struct Contract {
  bytes32 hash;
  address buyer;
  address seller;
  address currency;
  uint256 balance;
  uint256 amount;
  uint256 duration;
  uint256 threshold;
  Status status;
  Info info;
}

enum Status {Pending, Active, Finished, Disputed, Cancelled}

abstract contract BasicEscrow is Ownable, Hash {
  using SafeMath for uint256;

  address public WETH;
  mapping(bytes32 => Contract) public contracts;

  function setWETH(address weth_) external onlyOwner {
    WETH = weth_;
  }

  function _authorize(Contract memory contract_) internal view {
    require(contract_.buyer == msg.sender || contract_.seller == msg.sender, "Auth: Invalid permission");
  }

  function _verifyWithdraw(Contract memory _contract) internal pure {
    require(_contract.balance >= _contract.amount, "Refund: Invalid contract balance");
  }

  function _withdraw(address currency_, address to_, uint256 amount_) internal {
    if (WETH == currency_) {
      TransferHelper.safeTransferETH(
        to_,
        amount_
      );
    } else {
      TransferHelper.safeTransferFrom(
        currency_, 
        address(this),
        to_, 
        amount_
      );
    }
  }

  function _deposit(
    Contract memory contract_
  ) internal returns (uint256) {
    uint256 _amount = contract_.amount.sub(
      contract_.balance
    );

    if (WETH == contract_.currency) {
      require(msg.value >= _amount, "Deposit: Invalid deposit amount");
    } else {
      TransferHelper.safeTransferFrom(
        contract_.currency, 
        contract_.buyer,
        address(this), 
        _amount
      );
    }
    return _amount;
  }

  // If caller is buyer then deposit
  function _depositIfBuyer(
    Contract memory contract_
  ) internal returns (uint256) {
    if (msg.sender != contract_.buyer) {
      return 0;
    }
    return _deposit(contract_);
  }

  function _refund (
    Contract memory contract_
  ) internal {
    _verifyWithdraw(contract_);
    _withdraw(contract_.currency, contract_.buyer, contract_.amount);
  }

  function _refundRest (
    Contract memory contract_
  ) internal {
    _verifyWithdraw(contract_);
    _withdraw(contract_.currency, contract_.buyer, contract_.balance.sub(contract_.amount));
  }

  function _finish (
    Contract memory contract_
  ) internal {
    require(contract_.balance >= contract_.amount, "Finish: Invalid contract balance");
    _withdraw(contract_.currency, contract_.seller, contract_.amount);
  }

  receive() external payable {}
}
