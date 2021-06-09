// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

// TODO: create the reputationToken from the constructor and then save the reputationContracts address/interface
contract reputationController {
    string public name = "RepController";
    string public version = "v1";

    address public owner;
//    reputationToken repToken;

    // array that stores the admin addresses that can issue and burn reputation
    address[] admins;

    constructor() {
        // repToken is the reputationToken contract
//        repToken = reputationToken(_controls);
        // owner of contract is the address that deployed it
        owner = msg.sender;
        // adds owner the contract to the admins array
        admins.push(msg.sender);
    }

    modifier onlyOwner () {
        require(msg.sender == owner);
        _;
    }

    modifier onlyAdmins () {
        // TODO: loop through admin array
        require(msg.sender == owner);
        _;
    }

    function likeStandard(address _to) public onlyAdmins returns (bool success) {
        return true;
    }

    function destroy() public onlyOwner {
        selfdestruct(payable(owner));
    }

    receive() external payable {}
}

//contract reputationToken {
//    function issueReputation(address _to, uint256 _amount) external returns (bool success);
//    function burnReputation(address _from, uint256 _amount) external returns (bool success);
//}
