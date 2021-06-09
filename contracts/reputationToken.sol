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

  // stores the address of the owner of the smart contract
  address public owner;

  constructor(address _reputationController) public {
    // sets the controller of this contract as the reputationController contract
    controller = _reputationController;
    // sets the owner as the deployer (who deployed reputationToken and reputationController together)
    owner = msg.sender;
  }

  // Emitted when the contract generates and assigns and mount of reputation to an account
  event Issued(
    address indexed _to,
    uint256 amount
  );

  // Emitted when the contract burns some amount of reputation on a certain account
  event Burned(
    address indexed _from,
    uint256 amount
  );

  // Used to require that the msg.sender (caller) is the controller in order to execute a function
  modifier onlyControllerOrOwner () {
    require(msg.sender == controller || msg.sender == owner);
    _;
  }

  function issueReputation(address _to, uint256 _amount) public onlyControllerOrOwner returns (bool success) {
    reputationOf[_to] += _amount;
    emit Issued(_to, _amount);
    return true;
  }

  function burnReputation(address _from, uint256 _amount) public onlyControllerOrOwner returns (bool success) {
    reputationOf[_from] -= _amount;
    emit Burned(_from, _amount);
    return true;
  }

  // This function changes the controller contract address and is only accessible to the owner of this contract
  function changeController(address _newController) public returns (bool success) {
    require(msg.sender == owner);
    controller = _newController;
    return true;
  }
}
