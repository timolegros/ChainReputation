pragma solidity >=0.4.22 <0.9.0;

contract reputationController {
    address public owner;

    constructor() public {
        // owner of contract is the address that deployed it
        owner = msg.sender;
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
