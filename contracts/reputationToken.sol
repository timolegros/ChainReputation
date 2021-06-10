// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract reputationToken {
  string public name = "Reputation";
  string public symbol = "Rep";
  string public version = "v1";

  uint256 public granularity = 1;

  // mapping that stores reputation amount per address
  mapping(address => uint256) public reputationOf;

  // stores the standard interactions for modifying reputation
  mapping(string => InteractionStandard) public standards;

  // stores the admin structs which stores if the admin is authorized to issue/burn and also the amount they issued/burned
  mapping(address => Admin) public admins;

  // stores the address of the smart contract that controls this token
  address public controller;

  // stores the address of the owner of the smart contract
  address public owner;

  struct InteractionStandard {
    string name;
    uint reputation;
    mapping(string => string) misc;
  }

  struct Admin {
    bool authorized;
    uint256 totalIssued;
    uint256 totalBurned;
  }

  // Emitted when the contract generates and assigns and mount of reputation to an account
  event Issued(address indexed _to, uint256 amount);

  // Emitted when the contract burns some amount of reputation on a certain account
  event Burned(address indexed _from, uint256 amount);

  // Emitted when the owner adds an admin
  event AdminAdded(address indexed _newAdming);

  // Used to require that the msg.sender (caller) is the controller in order to execute a function
  modifier onlyAdminOrOwner () {
    require(admins[msg.sender].authorized == true || msg.sender == owner);
    _;
  }

  modifier onlyOwner () {
    require(msg.sender == owner);
    _;
  }



  constructor() {
    // sets the owner as the deployer (who deployed reputationToken and reputationController together)
    owner = msg.sender;
  }

  function issueReputation(address _to, uint256 _amount) external onlyAdminOrOwner returns (bool success) {
    reputationOf[_to] += _amount;
    emit Issued(_to, _amount);
    return true;
  }

  function burnReputation(address _from, uint256 _amount) external onlyAdminOrOwner returns (bool success) {
    if (reputationOf[_from] - _amount < 0) {
      reputationOf[_from] = 0;
    } else {
      reputationOf[_from] -= _amount;
    }

    emit Burned(_from, _amount);
    return true;
  }

  // allows the owner to add an admin
  function addAdmin(address _newAdmin) public onlyOwner returns (bool success) {
    return false;
  }

  // used to create or edit any interaction standard
  function manageStandard(string memory _name, uint256 _amountOfRep) public onlyOwner returns (bool success) {
    return true;
  }

  // used to clear a standard
  function removeStandard(string memory _name) public onlyOwner returns (bool success) {
    return true;
  }

  // TODO: devise method for transferring all reputation from one account to another (approval system?)

  function destroy() public onlyOwner {
    selfdestruct(payable(owner));
  }

  receive() external payable {}
}
