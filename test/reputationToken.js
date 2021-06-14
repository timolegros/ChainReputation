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
  let receivingAccTwo = accounts[4];
  let callingAcc = accounts[5]; // used as the 'from' address when testing function call from non-owner/admin account
  let newAdmin = accounts[2];
  let newAdminTwo = accounts[6];
  let newContract = accounts[3];

  it("Checks that the contract deploys without errors", async function () {
    await reputationToken.deployed();
    return assert.isTrue(true);
  });

  it('should set the token name, symbol, and granularity', async function () {
    let repToken = await reputationToken.deployed();
    assert.equal(cleanBytes(await repToken.name()), "Reputation");
    assert.equal(cleanBytes(await repToken.symbol()), "REPU");
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
      await repToken.addContract.call(newContract, web3.asciiToHex("TestContract"), { from: callingAcc });
      throw(new Error("addContract should only be callable by the owner"));
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
    }

    assert.equal(await repToken.addContract.call(newContract, web3.asciiToHex("TestContract"),
        { from: owner }), true, "Function should return true");

    let receipt = await repToken.addContract(newContract, web3.asciiToHex("TestContract"), { from: owner });
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
      await repToken.manageStandard.call(web3.asciiToHex("TestStandard"), 10, { from: callingAcc });
      throw(new Error("Function should throw an error when called by anyone but the owner"));
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, true, "Error returned must contain revert")
    }

    // tests that the owner can call the function and that it returns true
    assert.equal(await repToken.manageStandard.call(web3.asciiToHex("TestStandard"), 10, { from: owner }), true,
        "Function should allow the owner to use it and return true if successful")

    // tests adding a standard
    let receipt = await repToken.manageStandard(web3.asciiToHex("TestStandard"), 10, { from: owner });
    let standardNamesArray = await repToken.getStandardNames.call();
    assert(standardNamesArray.length === 1, "Only a single name should be in the list")
    assert.equal(cleanBytes(standardNamesArray[0]) === "TestStandard", true, "The standard name should be in the array");
    assert.equal(receipt.logs.length, 1, "An event should be triggered");
    assert.equal(receipt.logs[0].event, "StandardModified", "The event should be a StandardModified event");
    assert.equal(cleanBytes(receipt.logs[0].args._name), "TestStandard",
        "Should emit the correct name");
    assert.equal(receipt.logs[0].args._repAmount, 10, "Should emit the correct amount of reputation");
    assert.equal(receipt.logs[0].args._destroyed, false, "Should emit destroyed as false");

    // checks if the standards mapping correctly stores the new TestStandard
    let testStandard = await repToken.standards(web3.asciiToHex("TestStandard"), { from: owner });
    assert.equal(await testStandard.repAmount, 10, "Standard should have the correct repAmount");
    assert.equal(await testStandard.destroyed, false, "Standard should not be marked as destroyed");

    // tests deleting a standard
    receipt = await repToken.manageStandard(web3.asciiToHex("TestStandard"), 0, { from: owner });
    standardNamesArray = await repToken.getStandardNames.call();
    assert(standardNamesArray.length === 1, "Array length should be 1");
    assert(cleanBytes(standardNamesArray[0]) === "", "The standard name should be null in the array")
    assert.equal(receipt.logs.length, 1, "An event should be triggered");
    assert.equal(receipt.logs[0].event, "StandardModified", "The event should be a StandardModified event");
    assert.equal(cleanBytes(receipt.logs[0].args._name), "TestStandard",
        "Should emit the correct name");
    assert.equal(receipt.logs[0].args._repAmount, 0, "Should emit the correct amount of reputation");
    assert.equal(receipt.logs[0].args._destroyed, true, "Should emit destroyed as true");

    testStandard = await repToken.standards(web3.asciiToHex("TestStandard"), { from: owner });
    assert.equal(await testStandard.repAmount, 0, "Standard should be considered deleted")
    assert.equal(await testStandard.destroyed, true, "Standard should be marked as destroyed")
  });

  it('should allow admins to update a single reputation', async function () {
    let repToken = await reputationToken.deployed();

    await repToken.addAdmin(newAdminTwo, { from: owner });
    await repToken.manageStandard(web3.asciiToHex("PositiveStandard"), 10, { from: owner });
    await repToken.manageStandard(web3.asciiToHex("DestroyedStandard"), 0, { from: owner });
    await repToken.manageStandard(web3.asciiToHex("NegativeStandard"), -10, { from: owner });

    // tests that only owner/admin can use the applySingleStandard function
    try {
      await repToken.applySingleStandard.call(receivingAccTwo, web3.asciiToHex("PositiveStandard"), { from: callingAcc });
      throw(new Error("Function should throw an error when called by anyone but the owner"));
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, true, "Error returned must contain revert")
    }

    // tests that the owner can call the function and that it returns true
    assert.equal(await repToken.applySingleStandard.call(receivingAccTwo, web3.asciiToHex("PositiveStandard"),
        { from: owner }), true, "Function should allow the owner to use it and return true if successful");

    // tests that any admin can call the function and that it returns true
    assert.equal(await repToken.applySingleStandard.call(receivingAccTwo, web3.asciiToHex("PositiveStandard"),
        { from: newAdmin }), true, "Function should allow the admin to use it and return true if successful");

    try {
      await repToken.applySingleStandard.call(receivingAccTwo, web3.asciiToHex("DestroyedStandard"),
          { from: owner });
      assert.fail()
    } catch (error) {
      assert.equal(error.message.includes(receivingAccTwo.toLowerCase()), true,
          "Error message must contain the to account address")
      assert.equal(error.message.includes("DestroyedStandard"), true,
          "Error message must contain the name of the standard")
    }

    try {
      await repToken.applySingleStandard(receivingAccTwo, web3.asciiToHex("DestroyedStandard"), { from: owner});
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, true, "Error returned must contain revert")
    }

    let receipt = await repToken.applySingleStandard(receivingAccTwo, web3.asciiToHex("PositiveStandard"),
        { from: newAdminTwo });
    assert.equal(receipt.logs.length, 1, "An event should be triggered");
    assert.equal(receipt.logs[0].event, "Issued", "The event triggered should be an Issued event");
    assert.equal(receipt.logs[0].args._to, receivingAccTwo, "The receiving address emitted should be correct");
    assert.equal(receipt.logs[0].args._amount, 10, "The emitted issued amount should be 10");

    assert.equal(await repToken.reputationOf(receivingAccTwo, { from: owner }), 10, "User should have 10 reputation");

    receipt = await repToken.applySingleStandard(receivingAccTwo, web3.asciiToHex("NegativeStandard"),
        { from: newAdminTwo });
    assert.equal(receipt.logs.length, 1, "An event should be triggered");
    assert.equal(receipt.logs[0].event, "Burned", "The event triggered should be a Burned event");
    assert.equal(receipt.logs[0].args._from, receivingAccTwo, "The receiving address emitted should be correct");
    assert.equal(receipt.logs[0].args._amount, 10, "The emitted burned amount should be 10");

    assert.equal(await repToken.reputationOf(receivingAccTwo, { from: owner }), 0, "User should have 0 reputation");

    let admin = await repToken.admins(newAdminTwo, { from: owner });
    assert.equal(await admin.authorized, true, "Admin should be authorized");
    assert.equal(await admin.totalRepIssued.toNumber(), 10, "Admin should have issued a total of 10 reputation");
    assert.equal(await admin.totalRepBurned.toNumber(), 10, "Admin should have burned a total of 10 reputation");

  });

  it('should allow admins to batch update reputation', async function () {
    let repToken = await reputationToken.deployed();

    // tests that only owner/admin can use the applyBatchStandard function
    try {
      await repToken.applyBatchStandard.call([{to: receivingAcc, standardName: convToBytes32("TestStandard")},
            {to: receivingAcc, standardName: convToBytes32("TestStandard")}], { from: callingAcc });
      throw(new Error("Function should throw an error when called by anyone but the owner and admin"));
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, true, "Error returned must contain revert")
    }

    // // checks that the function can be called by any admin or the owner
    assert.isTrue(await repToken.applyBatchStandard.call([
        {to: receivingAcc, standardName: convToBytes32("PositiveStandard")},
        {to: receivingAcc, standardName: convToBytes32("PositiveStandard")}], { from: owner }))
    assert.isTrue(await repToken.applyBatchStandard.call([
        {to: receivingAcc, standardName: convToBytes32("PositiveStandard")},
        {to: receivingAcc, standardName: convToBytes32("PositiveStandard")}], { from: newAdmin }))
    assert.isTrue(await repToken.applyBatchStandard.call([
      {to: receivingAcc, standardName: convToBytes32("PositiveStandard")},
      {to: receivingAcc, standardName: convToBytes32("PositiveStandard")}], { from: newAdminTwo }))

    await repToken.applyBatchStandard([{to: receivingAcc, standardName: convToBytes32("PositiveStandard")},
      {to: receivingAcc, standardName: convToBytes32("PositiveStandard")}], { from: owner })
    assert.equal((await repToken.reputationOf(receivingAcc)).toNumber(), 70, "The receiving account should have 70 reputation");

    await repToken.applyBatchStandard([
        {to: receivingAcc, standardName: convToBytes32("NegativeStandard")},
        {to: receivingAcc, standardName: convToBytes32("NegativeStandard")},
        {to: receivingAcc, standardName: convToBytes32("NegativeStandard")}], { from: owner })
    assert.equal(await repToken.reputationOf(receivingAcc), 40, { from: owner });
    // at this point the receivingAcc has 40 reputation
  });

  it('should allow admins and owners to make reputation updates using user batches', async function () {
    let repToken = await reputationToken.deployed();
    let data = [
      {
        to: receivingAcc,
        counts: [
          { name: convToBytes32("PositiveStandard"), count: 8},
          { name: convToBytes32("NegativeStandard"), count: 2}
        ]
      },
      { to: receivingAccTwo,
        counts: [
          { name: convToBytes32("PositiveStandard"), count: 30},
          { name: convToBytes32("PositiveStandard"), count: 30},
          { name: convToBytes32("NegativeStandard"), count: 20}
        ]
      }
    ]

    // tests that only owner/admins can use the applyUserBatchStandard function
    try {
      await repToken.applyUserBatchStandard.call(data, { from: callingAcc });
      throw(new Error("Function should throw an error when called by anyone but the owner and admin"));
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, true, "Error returned must contain revert")
    }

    assert.isTrue(
        await repToken.applyUserBatchStandard.call(data, { from: owner }),
        "Function should all owners to call it and return true");
    assert.isTrue(
        await repToken.applyUserBatchStandard.call(data, { from: newAdmin }),
        "Function should all owners to call it and return true");
    assert.isTrue(
        await repToken.applyUserBatchStandard.call(data, { from: newAdminTwo }),
        "Function should all owners to call it and return true");

    await repToken.applyUserBatchStandard(data, { from: newAdminTwo });
    assert.equal((await repToken.reputationOf(receivingAcc)).toNumber(), 100, { from: owner });
  });
});

function cleanBytes(string) {
  return web3.toAscii(string).replace(/\0.*$/g,'')
}

function convToBytes32(string) {
  return web3.padRight(web3.asciiToHex(string), 64)
}

//  function bytesToBytes32(bytes memory b) public returns (bytes32) {
//     bytes32 temp;
//     assembly {
//       temp := mload(add(b, 32))
//     }
//     return temp;
//   }
