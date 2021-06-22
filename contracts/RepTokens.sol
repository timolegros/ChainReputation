// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface IRepTokens{

  /**
  * @notice This struct represents a single reputation Token type
  * @dev The CID is an IPFS CID that stores the token standards and the controllers is a mapping of address to booleans
  * where if the bool is true then that address has permission to issue and burn the token. inUse is a boolean where
  * when it is true it indicates that the token is being used/is valid (false indicates it has been destroyed or was
  * never initialized).
  */
  // TODO: best data structure for storing controllers?
  struct Token {bytes CID; bool inUse; mapping(address => bool) controllers; address owner;}

  /**
  * @dev This emits when the name, owner, or state of the token changes
  */
  event TokenChanged(bytes32 indexed _tokenName, address indexed _owner, bool _inUse);

  /**
* @dev This emits when _amount _tokenName is issued to _to
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
  * @dev This emits when a controller of the token changes
  */
  event ControllerChanged(bytes32 indexed _tokenName, address indexed _controller, bool _allowed);

  /**
  * @notice Counts the amount of a specific token the _owner has
  * @param _owner The address to check the balance ofi
  * @param _tokenName The token name to lookup in the addresses balance mapping
  * @return uint256
  */
  function balanceOf(address _owner, bytes32 _tokenName) external view returns (uint256);

  /**
  * @notice Returns the CID, state, and address of the owner of a token
  * @param _tokenName The name of the token to get
  * @return Token
  */
  function getToken(bytes32 _tokenName) external view returns (bytes memory, bool, address);

  /**
  * @notice Creates a new token whose standards are defined on IPFS at the _CID
  * @dev This function will revert if inUse var of the token defined at _tokenName is true
  * @param _CID The IPFS CID at which the standard of the new token is stored
  * @param _tokenName The name for the new token
  * @param _controllers An array of addresses that will be allowed to issue/burn this token (can be changed later)
  * @return bool
  */
  function createToken(bytes memory _CID, bytes32 _tokenName, address[] memory _controllers) external returns (bool);

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
  * @notice This function enables managing permissions to a token. Only addresses marked as true in the controllers
  * mapping defined in the Token struct can issue or burn the token.
  * @dev msg.sender must be the owner of the token to use this function
  * @param _tokenName The name of the token to manage controllers for
  * @param _controller The address of the controller to set
  * @param _state The boolean value to assign to the _controller address in the controllers mapping
  * @return bool
  */
  function manageController(bytes32 _tokenName, address _controller, bool _state) external returns (bool);

  /**
  * @notice This function enables managing the data of the token. This includes the token name, state, and CID.
  * WARNING this function is all or nothing. For example, in order to change the _CID you must also pass the _tokenName
  * and _state otherwise these will be reset to default value.
  * @dev msg.sender must be the owner of the token to use this function.
  * @param _CID The CID of the data on IPFS
  * @param _tokenName The name of the token to manage
  * @param _inUse A boolean where true indicates the token is being used or is active and false means the token was
  * never initialized or was destroyed
  * @return bool
  */
  function manageToken(bytes memory _CID, bytes32 _tokenName, bool _inUse) external returns (bool);

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
  bytes9 public version = "v2.0.0";

  // mapping from the token name to the Token struct
  mapping(bytes32 => Token) private tokens_;

  // mapping from addresses/accounts to a mapping from the token name to the balance
  mapping(address => mapping(bytes32 => uint256)) private balances_;

  modifier onlyOwner(bytes32 _tokenName) {
    require(tokens_[_tokenName].owner == msg.sender, "You must be the owner of the token to use this function");
    _;
  }

  // this modifier allows the owner of a token by default
  modifier onlyControllers(bytes32 _tokenName) {
    require(tokens_[_tokenName].owner == msg.sender || tokens_[_tokenName].controllers[msg.sender] == true,
      "You must be the owner or a controller of this token to use this function");
    _;
  }

  function balanceOf(address _owner, bytes32 _tokenName) external view override returns (uint256) {
    require(_owner != address(0), "balance query for the zero address");
    return balances_[_owner][_tokenName];
  }

  function getToken(bytes32 _tokenName) external view override returns (bytes memory, bool, address) {
    return (tokens_[_tokenName].CID, tokens_[_tokenName].inUse, tokens_[_tokenName].owner);
  }

  function isController(bytes32 _tokenName, address _controller) external view returns (bool) {
    return tokens_[_tokenName].controllers[_controller];
  }

  function createToken(bytes memory _CID, bytes32 _tokenName, address[] memory _controllers) external override returns (bool) {
    // ensure the token is not in use
    require(tokens_[_tokenName].inUse == false);

    tokens_[_tokenName].CID = _CID;
    tokens_[_tokenName].inUse = true;
    tokens_[_tokenName].owner = msg.sender;

    for(uint i = 0; i < _controllers.length; i++) {
      tokens_[_tokenName].controllers[_controllers[i]] = true;
    }

    emit TokenChanged(_tokenName, msg.sender, true);
    return true;
  }

  function issue(bytes32 _tokenName, address _to, uint256 _amount) external override onlyControllers(_tokenName) returns (bool) {
    require(tokens_[_tokenName].inUse == true, "The token must be inUse (active/not-destroyed)");
    balances_[_to][_tokenName] = add(balances_[_to][_tokenName], _amount);
    emit Issued(_tokenName, _to, _amount);
    return true;
  }

  function burn(bytes32 _tokenName, address _from, uint256 _amount) external override onlyControllers(_tokenName) returns (bool) {
    require(tokens_[_tokenName].inUse == true, "The token must be inUse (active/not-destroyed)");
    if (balances_[_from][_tokenName] - _amount < 0) {
      balances_[_from][_tokenName] = 0;
    } else {
      balances_[_from][_tokenName] = sub(balances_[_from][_tokenName], _amount);
    }
  emit Burned(_tokenName, _from, _amount);
  return true;
  }

  function manageController(bytes32 _tokenName, address _controller, bool _state) external override returns (bool) {
    return true;
  }

  function manageToken(bytes memory _CID, bytes32 _tokenName, bool _inUse) external override returns (bool) {
    return true;
  }

  function transferOwnership(bytes32 _tokenName, address _newOwner) external override returns (bool) {
    return true;
  }

  /**
* @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
*/
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
    c = a + b;
    assert(c >= a);
    return c;
  }
}