// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract reputationToken {
  bytes10 public name = "Reputation";
  bytes3 public symbol = "Rep";
  bytes9 public version = "v1.0.0";

  uint256 public granularity = 1;

  // mapping that stores reputation amount per address
  mapping(address => uint256) public reputationOf;

  // stores the standard interactions for modifying reputation
  mapping(bytes32 => InteractionStandard) public standards;

  // stores the admin structs which stores if the admin is authorized to issue/burn and also the amount they issued/burned
  mapping(address => Admin) public admins;

  bytes32[] public standardNames;

  // stores the address of the owner of the smart contract
  address public owner;

  // the mapping is there to store any miscellaneous data that may need to be associated with standards in the future
  struct InteractionStandard {
    uint repAmount;
    //    mapping(bytes32 => bytes32) misc;  // TODO: decide whether this is necessary
  }

  struct Admin {
    bool authorized;
    uint256 totalRepIssued;
    uint256 totalRepBurned;
  }

  // Emitted when the contract generates and assigns and mount of reputation to an account
  event Issued(address indexed _to, uint256 _amount);

  // Emitted when the contract burns some amount of reputation on a certain account
  event Burned(address indexed _from, uint256 _amount);

  // Emitted when the owner adds an admin
  event AdminAdded(address indexed _newAdmin);

  // Emitted when a standard is created, edited, or destroyed
  event StandardModified(bytes32 indexed _name, uint256 _repAmount, bool indexed _destroyed);

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

//  function getStandardMisc(bytes32 _name, bytes32 _value) public returns (bytes32) {
//    return standards[_name].misc[_value];
//  }

  function getStandardNames() public returns (bytes32[] memory){
    return standardNames;
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

  // allows the owner to add an admin but also clear an admins issued/burned counts
  function addAdmin(address _newAdmin) public onlyOwner returns (bool success) {
    admins[_newAdmin] = Admin(true, 0, 0);
    emit AdminAdded(_newAdmin);
    return true;
  }

  // used to create or edit any interaction standard
  function manageStandard(bytes32 _name, uint256 _repAmount) public onlyOwner returns (bool success) {
    // check if _name is in standardNames array -- if it is set flag to true
    bool flag = false;
    for (uint256 i=0; i < standardNames.length; i++) {
      if (_name == standardNames[i]) {
        flag = true;
        break;
      }
    }
    // if flag is false at this point then _name is not in standardNames so add it
    if (flag == false) {
      standardNames.push(_name);
    }

    standards[_name].repAmount = _repAmount;

    emit StandardModified(_name, _repAmount, false);
    return true;
  }

  // used to clear a standard
  function removeStandard(bytes32 _name) public onlyOwner returns (bool success) {
    return true;
  }

  // TODO: devise method for transferring all reputation from one account to another (approval system?)

  function destroy() public onlyOwner {
    selfdestruct(payable(owner));
  }

  receive() external payable {}
}
