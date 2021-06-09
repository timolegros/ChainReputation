// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract reputationToken {
  string public name = "Reputation";
  string public symbol = "Rep";
  uint256 public granularity = 1;

  // mapping that stores reputation amount per address
  mapping(address => uint256) public reputationOf;

  // stores the address of the smart contract that controls this token
  address public controller;

  constructor(address _reputationController) public {
    // sets the controller of this contract as the reputationController contract
    controller = _reputationController;
  }

  // Used to require that the msg.sender (caller) is the controller in order to execute a function
  modifier onlyController () {
    require(msg.sender == controller);
    _;
  }

  function issueReputation(address _admin, uint256 _amount) public onlyController returns (bool success) {
    return true;
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

  // TODO: create function so that only the owner/creator of this contract can change the controller/controlling contract

}
