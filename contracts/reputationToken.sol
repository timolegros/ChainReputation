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

  // stores admin information
  struct Admin {
    bool authorized;
    uint256 totalRepIssued;
    uint256 totalRepBurned;
  }

  // stores information on an external contract that has the rights to issue and burn reputation
  struct ExternalContract {
    bool authorized;
    bytes32 name;
  }

  // regular batching
  // used when batching multiple single standards/users together
  struct BatchStandards {
    address to;
    bytes32 standardName;
  }

  // used in user batching to store the standard names and the number of times that standard should be applied to a user
  struct StandardCount {
    bytes32 name;
    uint count;
  }

  // user optimized batching
  // struct that represents a single user with their address and the standards plus their frequency
  struct UserBatch {
    address to;
    StandardCount[] counts;
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
    if (amount == 0 || standards[_standardName].destroyed == true) {
      revert (string(abi.encodePacked(
          "Cannot apply ", bytes32ToString(_standardName), " to address: ", toString(_to)
        ))
      );
    }
//    require(amount != 0 || standards[_standardName].destroyed != true);
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

  // The optimized method of batching by grouping standards under different users. The comment below displays what the
  // format of the data should be. This method allows storing reputation data on a database and periodically updating
  // the smart contract in order to reduce the total number of transactions.
  // to: address to give reputation to
  // counts: array containing the standards (and their amount) to apply to a specific user
  // name: name of the standard
  // count: the number of time this standard should be applied for the to address
  /*
    [{to:, counts: [{name: "", count: 0}, {name: "", count: 0}]},
    {to:, counts: [{name: "", count: 0}, {name: "", count: 0}]}]
  */
  function applyUserBatchStandard(UserBatch[] memory _batch) public onlyAdmin returns (bool) {
    // loop through the users
    for (uint256 i=0; i < _batch.length; i++) {
      int256 total;
      UserBatch memory user = _batch[i];
      StandardCount memory currentStandard;
      InteractionStandard memory storedStandard;
      bytes32 name;
      // loop through the standards to apply to each user
      for (uint256 j=0; j < user.counts.length; j++) {
        currentStandard = user.counts[j];
        storedStandard = standards[currentStandard.name];
        if (storedStandard.repAmount == 0 || storedStandard.destroyed == true) continue;
        total += storedStandard.repAmount * int256(currentStandard.count);
      }

      if (total < 0) {
        if (reputationOf[user.to] - uint256(total * -1) >= 0) {
          reputationOf[user.to] -= uint256(total * -1);
        } else {
          reputationOf[user.to] = 0;
        }
      } else if (total > 0) {
        reputationOf[user.to] += uint256(total);
      }
    }
    return true;
  }

  // TODO: Group by users where each user has a to address and then an array of standard names to apply
  function applyBatchStandard(BatchStandards[] memory _batch) public onlyAdmin returns (bool) {
//    return bytesToBytes32(_batch[0].standardName, 0);
    for (uint256 i=0; i < _batch.length; i++) {
      applySingleStandard(_batch[i].to, _batch[i].standardName);
    }
    return true;
  }

  // TODO: devise method for transferring all reputation from one account to another (approval system?)

  function toString(address account) private pure returns (string memory) {
    return toString(abi.encodePacked(account));
  }

  function toString(bytes memory data) private pure returns (string memory) {
    bytes memory alphabet = "0123456789abcdef";

    bytes memory str = new bytes(2 + data.length * 2);
    str[0] = "0";
    str[1] = "x";
    for (uint i = 0; i < data.length; i++) {
      str[2+i*2] = alphabet[uint(uint8(data[i] >> 4))];
      str[3+i*2] = alphabet[uint(uint8(data[i] & 0x0f))];
    }
    return string(str);
  }

  function bytes32ToString(bytes32 _bytes32) private pure returns (string memory) {
    uint8 i = 0;
    while(i < 32 && _bytes32[i] != 0) {
      i++;
    }
    bytes memory bytesArray = new bytes(i);
    for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
      bytesArray[i] = _bytes32[i];
    }
    return string(bytesArray);
  }

  function destroy() public onlyOwner {
    selfdestruct(payable(owner));
  }

//  receive() external payable {}
}
