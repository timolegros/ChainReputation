pragma solidity >=0.4.22 <0.9.0;

contract reputationController {
    address public owner;

    // array that stores the admin addresses that can issue and burn reputation
    address[] admins;

    constructor() public {
        // owner of contract is the address that deployed it
        owner = msg.sender;
        // adds owner the contract to the admins array
        admins.push(msg.sender);
    }

    modifier onlyOwner () {
        require(msg.sender == owner);
        _;
    }

    function destroy() public onlyOwner {
        selfdestruct(payable(owner));
    }

    receive() external payable {}
}
