// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IRepFactory {
  /**
  * @notice This struct represents a single reputation Token type
  * @dev The CID is an IPFS CID that stores the token standards and the oracles address array stores the oracles that
  * the token owner "trusts".
  */
  struct Token { bytes CID; address[] oracles; address owner; }


}

contract RepFactory is Ownable{
  constructor() public {
  }
}
