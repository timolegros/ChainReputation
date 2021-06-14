// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract reputationToken {
  bytes10 public name = "Reputation";
  bytes4 public symbol = "REPU";
  bytes9 public version = "v1.0.0";

  uint256 public granularity = 1;

  // mapping that stores reputation amount per address
  mapping(address => uint256) public reputationOf;

  // stores the standard interactions for modifying reputation
  mapping(bytes32 => InteractionStandard) public standards;

  // stores the admin structs which stores if the admin is authorized to issue/burn and also the amount they issued/burned
  mapping(address => Admin) public admins;

  // stores the ExternalContract structs which store info on any contracts that are authorized to use specific functions
  mapping(address => ExternalContract) public contracts;

  // array of names of InteractionStandards -- for convenience
  bytes32[] public standardNames;

  // stores the address of the owner of the smart contract
  address public owner;

  // the mapping is there to store any miscellaneous data that may need to be associated with standards in the future
  struct InteractionStandard {
    int256 repAmount; // can be negative for negative interactions such as being banned on a forum
    bool destroyed; // used to indicate if the standard has been "deleted"
    //    mapping(bytes32 => bytes32) misc;  // TODO: decide whether this is necessary
  }

  struct Admin {
    bool authorized;
    uint256 totalRepIssued;
    uint256 totalRepBurned;
  }

  struct ExternalContract {
    bool authorized;
    bytes32 name;
  }

  struct BatchStandards {
    address to;
    bytes32 standardName;
  }

  // Emitted when the contract generates and assigns and mount of reputation to an account
  event Issued(address indexed _to, uint256 _amount);

  // Emitted when the contract burns some amount of reputation on a certain account
  event Burned(address indexed _from, uint256 _amount);

  // Emitted when the owner adds an admin
  event AdminAdded(address indexed _newAdmin);

  // Emitted when a standard is created, edited, or destroyed
  event StandardModified(bytes32 indexed _name, int256 _repAmount, bool indexed _destroyed);

  // Emitted when the owner adds a contract
  event ContractAdded(address indexed _newContract, bytes32 indexed _name);


  // BY DEFAULT THESE MODIFIERS GIVE THE OWNER FULL CONTROL
  // Used to require that the msg.sender (caller) is the controller in order to execute a function
  modifier onlyAdmin () {
    require(admins[msg.sender].authorized == true || msg.sender == owner);
    _;
  }

  modifier onlyContract () {
    require(contracts[msg.sender].authorized == true || msg.sender == owner);
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

  // function to issue reputation that can only be used by an authorized external contract
  function issueReputation(address _to, uint256 _amount) external onlyContract returns (bool success) {
    reputationOf[_to] += _amount;
    emit Issued(_to, _amount);
    return true;
  }

  // function to burn reputation that can only be used by an authorized external contract
  function burnReputation(address _from, uint256 _amount) external onlyContract returns (bool success) {
    if (reputationOf[_from] - _amount < 0) {
      reputationOf[_from] = 0;
    } else {
      reputationOf[_from] -= _amount;
    }

    emit Burned(_from, _amount);
    return true;
  }

  // allows the owner to add an admin but also clear an admins issued/burned counts
  function addAdmin(address _newAdmin) external onlyOwner returns (bool success) {
    admins[_newAdmin] = Admin(true, 0, 0);
    emit AdminAdded(_newAdmin);
    return true;
  }

  // allows the owner to add a contract or change its name
  function addContract(address _newContractAddr, bytes32 _name) external onlyOwner returns (bool) {
    contracts[_newContractAddr] = ExternalContract(true, _name);
    emit ContractAdded(_newContractAddr, _name);
    return true;
  }

  // used to create, edit, or delete any interaction standard
  function manageStandard(bytes32 _name, int256 _repAmount) external onlyOwner returns (bool success) {

    // check if _name is in standardNames array -- if it is set nameIndex to the its index in the array
    uint16 nameIndex = 0;
    for (uint16 i=0; i < standardNames.length; i++) {
      if (_name == standardNames[i]) {
        nameIndex = i + 1;
        break;
      }
    }

    if (_repAmount != 0) {
      standards[_name].repAmount = _repAmount;
      standards[_name].destroyed = false;
      // if the nameIndex is still 0 then the name is not already in the array
      if (nameIndex == 0) {
        standardNames.push(_name);
      }
    } else {
      standards[_name].repAmount = 0;
      standards[_name].destroyed = true;
      if (nameIndex > 0) {
        delete standardNames[nameIndex - 1];
      }
    }

    emit StandardModified(_name, _repAmount, _repAmount == 0);
    return true;
  }

  function applySingleStandard(address _to, bytes32 _standardName) public onlyAdmin returns (bool) {
    int256 amount = standards[_standardName].repAmount;
    require(amount != 0 && standards[_standardName].destroyed != true);
    if (amount < 0) {
      uint256 uAmount = uint256(amount * -1);
      require(reputationOf[_to] - uAmount >= 0);
      reputationOf[_to] -= uAmount;
      admins[msg.sender].totalRepBurned += uAmount;
      emit Burned(_to, uAmount);
    } else {
      reputationOf[_to] += uint256(amount);
      admins[msg.sender].totalRepIssued += uint256(amount);
      emit Issued(_to, uint256(amount));
    }
    return true;
  }

  function applyBatchStandard(BatchStandards[] memory _batch) public onlyAdmin returns (bool) {
//    return bytesToBytes32(_batch[0].standardName, 0);
    for (uint256 i=0; i < _batch.length; i++) {
//      applySingleStandard(_batch[i].to, bytesToBytes32(_batch[i].standardName));
      applySingleStandard(_batch[i].to, _batch[i].standardName);
      // TODO: error handling
    }
    return true;
  }

  // TODO: devise method for transferring all reputation from one account to another (approval system?)



  function destroy() public onlyOwner {
    selfdestruct(payable(owner));
  }

  receive() external payable {}
}
