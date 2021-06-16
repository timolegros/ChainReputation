// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface ReputationTokens{

  /**
  * @notice An enum that defines the current state of the token. A null token is unused or has not been created.
  * An active token is being used. A destroyed token is no longer in use and can be overwritten
  */
  enum TokenState {NULL, ACTIVE, DESTROYED}

  /**
  * @notice This struct represents a single reputation Token type
  * @dev The CID is an IPFS CID that stores the token standards and the controllers is a mapping of address to booleans
  * where if the bool is true then that address has permission to issue and burn the token
  */
  // TODO: best data structure for storing controllers?
  struct Token {bytes CID; TokenState state; mapping(address => bool) controllers; address owner;}

  /**
  * @dev This emits when the name, CID, or state of the token changes
  */
  event TokenChanged(bytes32 indexed _tokenName, address indexed _owner, TokenState _state);

  /**
  * @dev This emits when the balance of any token changes for any address (both issue and burn)
  */
  event BalanceChanged(bytes32 indexed _tokenName, address indexed _to, int256 _amount);

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
  function getToken(bytes32 _tokenName) external view returns (bytes memory, TokenState, address);

  /**
  * @notice Creates a new token whose standards are defined on IPFS at the _CID
  * @dev This function will revert if the state of the token defined at _tokenName is ACTIVE
  * @param _CID The IPFS CID at which the standard of the new token is stored
  * @param _tokenName The name for the new token
  * @return bool
  */
  function createToken(bytes memory _CID, bytes32 _tokenName) external returns (bool);

  /**
  * @notice Simple function to issue any type of token
  * @param _tokenName The name of the token to issue
  * @param _to The address to issue the token to
  * @return bool
  */
  function issue(bytes32 _tokenName, address _to) external returns (bool);

  /**
  * @notice Simple function to burn any type of token
  * @param _tokenName The name of the token to burn
  * @param _from The address to burn the token from
  * @return bool
  */
  function burn(bytes32 _tokenName, address _from) external returns (bool);

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
  * @param _state A TokenState enum that defines whether the token is null, active, or destroyed
  * @return bool
  */
  function manageToken(bytes memory _CID, bytes32 _tokenName, TokenState _state) external returns (bool);

  /**
  * @notice Transfers ownership of the specified token. The new owner can be any address including another contract
  * @dev This function can only be used by the current owner of the token i.e. msg.sender == current owner
  * @param _tokenName The name of the token to transfer
  * @param _newOwner The address of the new owner to transfer ownership to
  * @return bool
  */
  function transferOwnership(bytes32 _tokenName, address _newOwner) external returns (bool);

}

/**
@title The general standard for reputation tokens
@author Timothee Legros, Zak Hap
*/
contract Tokens is ReputationTokens {
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

  function balanceOf(address _owner, bytes32 _tokenName) external view override returns (uint256) {
    return uint256(200);
  }

  function getToken(bytes32 _tokenName) external view override returns (bytes memory, TokenState, address) {
    return (bytes(""), TokenState.ACTIVE, address(0));
  }

  function createToken(bytes memory _CID, bytes32 _tokenName) external override returns (bool) {
    return true;
  }

  function issue(bytes32 _tokenName, address _to) external override returns (bool) {
    return true;
  }

  function burn(bytes32 _tokenName, address _from) external override returns (bool) {
    return true;
  }

  function manageController(bytes32 _tokenName, address _controller, bool _state) external override returns (bool) {
    return true;
  }

  function manageToken(bytes memory _CID, bytes32 _tokenName, TokenState _state) external override returns (bool) {
    return true;
  }

  function transferOwnership(bytes32 _tokenName, address _newOwner) external override returns (bool) {
    return true;
  }
}
