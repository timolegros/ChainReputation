const reputationToken = artifacts.require("reputationToken");
const web3 = require("web3-utils")
/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */

// the owner for any call is by default owner
contract("reputationToken", function (accounts) {
  let owner = accounts[0];
  let receivingAcc = accounts[1];
  let callingAcc = accounts[5]; // used as the 'from' address when testing function call from non-owner/admin account
  let newAdmin = accounts[2];
  let newContract = accounts[3];

  it("Checks that the contract deploys without errors", async function () {
    await reputationToken.deployed();
    return assert.isTrue(true);
  });

  it('should set the token name, symbol, and granularity', async function () {
    let repToken = await reputationToken.deployed();
    assert.equal(cleanBytes(await repToken.name()), "Reputation");
    assert.equal(cleanBytes(await repToken.symbol()), "Rep");
    assert.equal(cleanBytes(await repToken.version()), "v1.0.0");
    assert.equal(await repToken.granularity(), 1);
  });

  it('should allow the owner to add admins', async function () {
    let repToken = await reputationToken.deployed();
    // checks that addAdmin function is not callable by anyone but the owner
    try {
      await repToken.addAdmin.call(newAdmin, { from: callingAcc });
      throw(new Error("addAdmin should only be callable by the owner"));
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
    }

    assert.equal(await repToken.addAdmin.call(newAdmin, { from: owner }), true, "Function should return true");

    let receipt = await repToken.addAdmin(newAdmin, { from: owner });
    assert.equal(receipt.logs.length, 1, "An event should be triggered");
    assert.equal(receipt.logs[0].event, "AdminAdded", "The event triggered should be an AdminAdded event");
    assert.equal(receipt.logs[0].args._newAdmin, newAdmin, "The new admin address emitted should be correct")

    let admin = await repToken.admins(newAdmin);
    assert.equal(await admin.authorized, true, "The new admin should be authorized to issue and burn reputation tokens");
    assert.equal(await admin.totalRepIssued, 0, "The new admin should have 0 total reputation issued");
    assert.equal(await admin.totalRepBurned, 0, "The new admin should have 0 total reputation burned");
  });

  it('should allow the owner to add contracts', async function () {
    let repToken = await reputationToken.deployed();
    // checks that addContract function is not callable by anyone but the owner
    try {
      await repToken.addContract.call(newContract, web3.fromAscii("TestContract"), { from: callingAcc });
      throw(new Error("addContract should only be callable by the owner"));
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
    }

    assert.equal(await repToken.addContract.call(newContract, web3.fromAscii("TestContract"),
        { from: owner }), true, "Function should return true");

    let receipt = await repToken.addContract(newContract, web3.fromAscii("TestContract"), { from: owner });
    assert.equal(receipt.logs.length, 1, "An event should be triggered");
    assert.equal(receipt.logs[0].event, "ContractAdded", "The event triggered should be a ContractAdded event");
    assert.equal(receipt.logs[0].args._newContract, newContract, "The new contract address emitted should be correct");
    assert.equal(cleanBytes(receipt.logs[0].args._name), "TestContract", "Emitted contract name should be TestContract")

    let contract = await repToken.contracts(newContract);
    assert.equal(await contract.authorized, true, "The new contract should be authorized to issue and burn reputation tokens");
    assert.equal(cleanBytes(await contract.name), "TestContract", "The new contract name should be TestContract");
  });

  it('should issue reputation to an account', async function () {
    let repToken = await reputationToken.deployed();

    // checks that the revert error is thrown if the issueReputation function is called by anyone but the owner or an admin
    try {
      await repToken.issueReputation.call(owner, 100, { from: callingAcc });
      throw(new Error("issueReputation function should only be callable by admins or the owner"));
    } catch(error) {
      assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
    }

    // checks that a negative value cannot be issued
    try {
      await repToken.issueReputation.call(receivingAcc, -100, { from: owner })
      throw(new Error("Cannot issue a negative amount of reputation"))
    } catch (error) {
      assert(error.code === "INVALID_ARGUMENT", "Ensures the amount argument cannot be negative")
    }

    assert.equal(await repToken.issueReputation.call(owner, 100, { from: newContract }), true,
        "Function should return true")

    // tests that the function is callable by the owner/deployer
    assert.equal(await repToken.issueReputation.call(owner, 100, { from: owner }), true,
        "Function should return true");

    let receipt = await repToken.issueReputation(owner, 100, { from: owner });
    assert.equal(receipt.logs.length, 1, "An event should be triggered");
    assert.equal(receipt.logs[0].event, "Issued", "The event triggered should be an Issued event");
    assert.equal(receipt.logs[0].args._to, owner, "Should be the correct to account");
    assert.equal(receipt.logs[0].args._amount, 100, "Should emit the correct amount of reputation")

    let reputation = await repToken.reputationOf(owner, { from: owner })
    assert.equal(reputation, 100, "to account should have the correct amount of reputation")

  });

  it('should burn reputation from an account', async function () {
    let repToken = await reputationToken.deployed();

    // checks that the revert error is thrown if the burnReputation function is called by anyone but the controller
    try {
      await repToken.burnReputation.call(receivingAcc, 100, { from: callingAcc });
      throw(new Error("burnReputation function should only be callable by the controller or the owner"));
    } catch(error) {
      assert(error.message.indexOf("revert") >= 0,
          "Error message must contain revert thereby indicating that the function returned an error");
    }

    // checks that a negative value cannot be burned
    try {
      await repToken.burnReputation.call(receivingAcc, -100, { from: owner })
      throw(new Error("Cannot burn a negative amount of reputation"))
    } catch (error) {
      assert(error.code === "INVALID_ARGUMENT", "Ensures the amount argument cannot be negative")
    }

    assert.equal(await repToken.burnReputation.call(owner, 100, { from: newContract }), true,
        "Function should return true");

    // tests that the function is callable by the owner/deployer
    assert.equal(await repToken.burnReputation.call(owner, 100, { from: owner }), true,
        "Function should return true");


    await repToken.issueReputation(receivingAcc, 100, { from: owner })
    let receipt = await repToken.burnReputation(receivingAcc, 50, { from: owner });
    assert.equal(receipt.logs.length, 1, "An event should be triggered");
    assert.equal(receipt.logs[0].event, "Burned", "The event triggered should be an Burned event");
    assert.equal(receipt.logs[0].args._from, receivingAcc, "Should be the correct from account");
    assert.equal(receipt.logs[0].args._amount, 50, "Should emit the correct amount of reputation")

    let reputation = await repToken.reputationOf(receivingAcc, { from: owner })
    assert.equal(reputation, 50, "to account should have the correct amount of reputation")
  });

  it('should allow the owner to manage interaction standards', async function () {
    let repToken = await reputationToken.deployed();

    try {
      await repToken.manageStandard.call(web3.fromAscii("TestStandard"), 10, { from: callingAcc });
      throw(new Error("Function should throw an error when called by anyone but the owner"));
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, true, "Error returned must contain revert")
    }

    assert.equal(await repToken.manageStandard.call(web3.fromAscii("TestStandard"), 10, { from: owner }), true,
        "Function should allow the owner to use it and return true if successful")

    let receipt = await repToken.manageStandard(web3.fromAscii("TestStandard"), 10, { from: owner });
    assert.equal(receipt.logs.length, 1, "An event should be triggered");
    assert.equal(receipt.logs[0].event, "StandardModified", "The event should be a StandardModified event");
    assert.equal(cleanBytes(receipt.logs[0].args._name), "TestStandard",
        "Should emit the correct name");
    assert.equal(receipt.logs[0].args._repAmount, 10, "Should emit the correct amount of reputation");
    assert.equal(receipt.logs[0].args._destroyed, false, "Should emit destroyed as false");

    let testStandard = await repToken.standards(web3.fromAscii("TestStandard"), { from: owner });

    // let temp = await repToken.getStandardMisc.call(web3.fromAscii("TestStandard"), "hello")

    // if interactionStandard struct contains more than 1 element that access elements specifically
    assert.equal(await testStandard.toNumber(), 10, "Standard should have the correct repAmount");

    // calls manageStandard again to test standardNames array functionality
    await repToken.manageStandard(web3.fromAscii("TestStandard"), 10, { from: owner });
    let standardNamesArray = await repToken.getStandardNames.call()
    assert(standardNamesArray.length === 1, "Only a single name should be in the list")
    assert.equal(cleanBytes(standardNamesArray[0]) === "TestStandard", true, "The standard name should be in the array");
  });


  it('should allow admins to update a single reputation', function () {
    assert.fail()
  });

  it('should allow admins to batch update reputation', function () {
    assert.fail()
  });

});

function cleanBytes(string) {
  return web3.toAscii(string).replace(/\0.*$/g,'')
}
