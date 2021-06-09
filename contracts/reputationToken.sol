// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract reputationToken {
  constructor() public {
  }

  string public name = "Reputation";
  string public symbol = "Rep";
  uint256 public granularity = 1;

  mapping(address => uint256) public reputationOf;

  function IssueReputation(address _admin, uint256 _amount) public returns (bool success){

  }

  // Emitted when the contract generates and assigns and mount of reputation to an account
  event Issued(
    address indexed owner,
    uint256 amount
  );

  // Emitted when the contract burns some amount of reputation on a certain account
  event Burned(
    address indexed owner,
    uint256 amount
  );

}
