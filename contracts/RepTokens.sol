// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface IRepTokens{

  /**
  * @notice This struct represents a single reputation Token type
  * @dev The CID is an IPFS CID that stores the token standards and the oracles is a mapping of address to booleans
  * where if the bool is true then that address has permission to issue and burn the token. State is an Enum where
  * when it is ACTIVE it indicates that the token is being used/is valid, INACTIVE indicates the token cannot be issued
  * or burned but its data should not be overwritten, and NULL indicates the token is not in use and can be overwritten
  */
  struct Token {bytes CID; TokenState state; address[] oracles_; address owner;}

  /**
  * @notice An enum that defines the current state of the token. A NULL token is unused or has not been created.
  * An ACTIVE token is being used/issued. An INACTIVE token cannot be issued/burned but cannot be overwritten/destroyed
  */
  enum TokenState {NULL, ACTIVE, INACTIVE}

  /**
  * @dev This emits when the CID of the token changes
  */
  event TokenStandardChanged(bytes32 indexed _tokenName);

  /**
  * @dev This emits when the token state changes
  */
  event TokenStateChanged(bytes32 indexed _tokenName, TokenState _state);

  /**
  * @dev This emits when _amount of _tokenName is issued to _to
  */
  event Issued(bytes32 indexed _tokenName, address indexed _to, uint256 _amount);

  /**
  * @dev This emits when _amount _tokenName is burned from _from
  */
  event Burned(bytes32 indexed _tokenName, address indexed _from, uint256 _amount);

  /**
  * @dev This emits when the owner of a token changes
  */
  event OwnerChanged(bytes32 indexed _tokenName, address indexed _from, address indexed _to);

  /**
  * @dev This emits when an oracle is added to the authorized array of a token
  */
  event OracleAdded(bytes32 indexed _tokenName, address indexed _oracle);

  /**
  * @dev This emits when an oracle is removed from the authorized oracles array of a token
  */
  event OracleRemoved(bytes32 indexed _tokenName, address indexed _oracle);

  /**
  * @notice Counts the amount of a specific token the _owner has that was issued/burned by _oracle
  * @param _owner The address to check the balance of
  * @param _oracle The address of the oracle
  * @param _tokenName The token name to lookup in the addresses balance mapping
  * @return uint256
  */
  function balanceOf(address _owner, address _oracle, bytes32 _tokenName) external view returns (uint256);

  /**
  * @notice calculates the true balance of any user (for any token) by totalling the issue/burned amounts from each
  * authorized oracle.
  * @param _owner The address of the owner whose balance we should calculate
  * @param _tokenName The name of the token to check the balance for
  * @return uint256
  */
  function trueBalanceOf(address _owner, bytes32 _tokenName) external view returns (uint256);

    /**
    * @notice Creates a new token whose standards are defined on IPFS at the _CID
    * @dev This function will revert if the token state var of the token defined at _tokenName is ACTIVE or INACTIVE
    * @param _CID The IPFS CID at which the standard of the new token is stored
    * @param _tokenName The name for the new token
    * @param _oracles An array of addresses that will be allowed to issue/burn this token (can be changed later)
    * @return bool
    */
  function createToken(bytes memory _CID, bytes32 _tokenName, address[] memory _oracles) external returns (bool);

  /**
  * @notice Simple function to issue any type of token
  * @param _tokenName The name of the token to issue
  * @param _to The address to issue the token to
  * @param _amount The unsigned integer amount of _tokenName to issue to _to
  * @return bool
  */
  function issue(bytes32 _tokenName, address _to, uint _amount) external returns (bool);

  /**
  * @notice Simple function to burn any type of token
  * @param _tokenName The name of the token to burn
  * @param _from The address to burn the token from
  * @param _amount The unsigned integer amount of _tokenName to burn from _from
  * @return bool
  */
  function burn(bytes32 _tokenName, address _from, uint _amount) external returns (bool);

  /**
  * @notice This function adds an oracle as a trusted issuer/burner of a token
  * @dev msg.sender must be the owner of the token to use this function
  * @param _tokenName The name of the token to manage oracles for
  * @param _oracle The address of the oracle to set
  * @return true if successful
  */
  function addOracle(bytes32 _tokenName, address _oracle) external returns (bool);

  /**
  * @notice This function removes an oracle as a trusted issuer/burner of a token
  * @dev msg.sender must be the owner to use this function
  * @param _tokenName The name of the token to remove the oracle from
  * @param _oracle The address of the oracle to remove
  * @return true if successful
  */
  function removeOracle(bytes32 _tokenName, address _oracle) external returns (bool);

  /**
  * @notice This function changes a tokens CID which points to its standard on IPFS
  * @param _tokenName The name of the token whose CID should be changed
  * @param _CID The CID of the new token standard on IPFS
  * @return bool
  */
  function changeTokenStandard(bytes32 _tokenName, bytes memory _CID) external returns (bool);

  /**
  * @notice This function can either soft delete a token or undelete a token by setting the state parameter of a token.
  * This function can be used to temporarily suspend a token.
  * @param _tokenName The name of the token whose state the function should change
  * @return bool Returns true is successful
  */
  function changeTokenState(bytes32 _tokenName, TokenState _state) external returns (bool);

  /**
  * @notice Transfers ownership of the specified token. The new owner can be any address including another contract
  * @dev This function can only be used by the current owner of the token i.e. msg.sender == current owner
  * @param _tokenName The name of the token to transfer
  * @param _newOwner The address of the new owner to transfer ownership to
  * @return bool
  */
  function transferOwnership(bytes32 _tokenName, address _newOwner) external returns (bool);

}

contract RepTokens is IRepTokens {
  bytes16 public name = "ReputationTokens";
  bytes4 public symbol = "REPU";
  bytes9 public version = "v3.0.0";

  // mapping from the token name to the Token struct
  mapping(bytes32 => Token) public tokens;

  // stores token balances minted by each oracle by user
  mapping(address => mapping(bytes32 => mapping(address => uint256))) public balanceOf_;

  // stores the index of the oracle address in the oracle array in a Token struct -- 0 indicates it is not present
  // aka index=1 is the first element in the array
  mapping(address => mapping(bytes32 => uint256)) private oracles;

  modifier onlyOwner(bytes32 _tokenName) {
    require(tokens[_tokenName].owner == msg.sender, "You must be the owner of the token to use this function");
    _;
  }

  // this modifier allows the owner of a token by default
  modifier onlyOracles(bytes32 _tokenName) {
    require(tokens[_tokenName].owner == msg.sender || oracles[msg.sender][_tokenName] != 0,
    "You must be the owner or an oracle of this token to use this function");
    _;
  }

  modifier onlyActive(bytes32 _tokenName) {
    require(tokens[_tokenName].state == TokenState.ACTIVE, "The token must be active(i.e. state == Active)");
    _;
  }

  function getOracles(bytes32 _tokenName) external view returns (address [] memory) {
    return tokens[_tokenName].oracles_;
  }

  function balanceOf(address _owner, address _oracle, bytes32 _tokenName) external view override returns (uint256) {
    require(_owner != address(0), "Cannot query balance of the zero address");
    return balanceOf_[_oracle][_tokenName][_owner];
  }

  // returns the true balance of an address because it omits removed oracles from the total balance
  function trueBalanceOf(address _owner, bytes32 _tokenName) external view override returns (uint256) {
    require(_owner != address(0), "Cannot query balance of the zero address");
    require(tokens[_tokenName].state != TokenState.NULL, "Cannot query balance of uninstantiated tokens");

    uint256 total = 0;
    for (uint256 i = 0; i < tokens[_tokenName].oracles_.length; i++) {
      total += balanceOf_[tokens[_tokenName].oracles_[i]][_tokenName][_owner];
    }
    return total;
  }

  function createToken(bytes memory _CID, bytes32 _tokenName, address[] memory _oracles) external override returns (bool) {
    // ensure the token is not ACTIVE or INACTIVE --- ensures this function cannot be used to change the owner of a token
    require(tokens[_tokenName].state == TokenState.NULL, "Token state MUST be null");

    tokens[_tokenName].CID = _CID;
    tokens[_tokenName].state = TokenState.ACTIVE;
    tokens[_tokenName].owner = msg.sender;

    // adds the oracles to the oracles_ array in the token struct and stores their array index in oracles mapping
    for(uint i = 0; i < _oracles.length; i++) {
      tokens[_tokenName].oracles_.push(_oracles[i]);
      oracles[_oracles[i]][_tokenName] = i + 1; // MUST BE +1 SINCE 1 IS CONSIDERED THE FIRST ELEMENT OF THE ARRAY
    }

    emit TokenStateChanged(_tokenName, TokenState.ACTIVE);
    return true;
  }

  function issue(bytes32 _tokenName, address _to, uint256 _amount) external override onlyOracles(_tokenName) onlyActive(_tokenName) returns (bool) {
    require(_to != address(0), "RepToken: issue to the zero address");
    balanceOf_[msg.sender][_tokenName][_to] += _amount;
    emit Issued(_tokenName, _to, _amount);
    return true;
  }

  function burn(bytes32 _tokenName, address _from, uint256 _amount) external override onlyOracles(_tokenName) onlyActive(_tokenName) returns (bool) {
    require(_from != address(0), "RepToken: burn from the zero address");
    require(_amount > 0, "Cannot burn 0 tokens");

    uint256 burnedAmount = 0;

    if (balanceOf_[msg.sender][_tokenName][_from] < _amount) {
      burnedAmount = balanceOf_[msg.sender][_tokenName][_from];
      balanceOf_[msg.sender][_tokenName][_from] = 0;
    } else {
      burnedAmount = _amount;
      balanceOf_[msg.sender][_tokenName][_from] -= _amount;
    }
    emit Burned(_tokenName, _from, burnedAmount);
    return true;
  }

  function addOracle(bytes32 _tokenName, address _oracle) external override onlyOwner(_tokenName) returns (bool) {
    require(oracles[_oracle][_tokenName] == 0, "Oracle is already authorized");
    // add _oracle to the oracles array
    tokens[_tokenName].oracles_.push(_oracle);
    // save index of oracle in mapping for rapid access
    oracles[_oracle][_tokenName] = tokens[_tokenName].oracles_.length;
    emit OracleAdded(_tokenName, _oracle);
    return true;
  }

  // removes a oracle from a tokens oracles array by replacing the oracle to remove with the last oracle in the array
  function removeOracle(bytes32 _tokenName, address _oracle) external override onlyOwner(_tokenName) returns (bool) {
    require(_oracle != address(0), "removing the zero address");
    require(oracles[_oracle][_tokenName] != 0, "oracle is not authorized on this token");

    address lastOracle = tokens[_tokenName].oracles_[tokens[_tokenName].oracles_.length - 1];

    // replace oracle address to remove the address of the last oracle in the array
    tokens[_tokenName].oracles_[oracles[_oracle][_tokenName] - 1] = lastOracle;
    // update index of the oracle address that was moved in the array
    oracles[lastOracle][_tokenName] = oracles[_oracle][_tokenName];
    // reset the index of the oracle to remove to 0
    oracles[_oracle][_tokenName] = 0;
    // shorten the array (delete the last element)
    tokens[_tokenName].oracles_.pop();

    emit OracleRemoved(_tokenName, _oracle);
    return true;
  }

  function changeTokenStandard(bytes32 _tokenName, bytes memory _CID) external override onlyOwner(_tokenName) returns (bool) {
    require(keccak256(tokens[_tokenName].CID) != keccak256(_CID), "CID must be different");
    tokens[_tokenName].CID = _CID;
    emit TokenStandardChanged(_tokenName);
    return true;
  }

  function changeTokenState(bytes32 _tokenName, TokenState _state) external override onlyOwner(_tokenName) returns (bool) {
    require(tokens[_tokenName].state != _state, "State must be different");
    tokens[_tokenName].state = _state;
    emit TokenStateChanged(_tokenName, _state);
    return true;
  }

  function transferOwnership(bytes32 _tokenName, address _newOwner) external override onlyOwner(_tokenName) returns (bool) {
    require(_newOwner != tokens[_tokenName].owner, "New owner must be different than the current owner");
    address currentOwner = tokens[_tokenName].owner;
    tokens[_tokenName].owner = _newOwner;
    emit OwnerChanged(_tokenName, currentOwner, _newOwner);
    return true;
  }
}
