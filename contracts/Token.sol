//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Token is ERC20, Ownable {
    constructor() ERC20 ('Test Token', 'TT') {
        _mint(owner(), 10 ** 5 * 10 ** 18);
    }

    function airdrop(address to_, uint256 amount_) external {
        _mint(to_, amount_);
    }
}
