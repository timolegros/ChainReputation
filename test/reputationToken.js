const reputationToken = artifacts.require("reputationToken");
const reputationController = artifacts.require("reputationController")

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("reputationToken", function (accounts) {
  it("should assert true", async function () {
    await reputationToken.deployed();
    return assert.isTrue(true);
  });

  it('should set the token name, symbol, and granularity', async function () {
    let repToken = await reputationToken.deployed();
    assert.equal(await repToken.name(), "Reputation");
    assert.equal(await repToken.symbol(), "Rep");
    assert.equal(await repToken.granularity(), 1);
  });

  it('should set the controller as the reputationController contract instance', async function () {
    let repToken = await reputationToken.deployed();
    let repController = await reputationController.deployed();
    assert.equal(await repToken.controller(), repController.address, "Reputation Token controller is not correct")
  });

  it('should issue reputation to an account', async function () {
    let repToken = await reputationToken.deployed();
    let repController = await reputationController.deployed();

    // checks that the revert error is thrown if the issueReputation function is called by anyone but the controller
    try {
      await repToken.issueReputation.call(accounts[0], 100);
      throw(new Error("issueReputation function should only be callable by the controller"));
    } catch(error) {
      assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
    }

    assert.equal(await repToken.issueReputation.call(accounts[0], 100, { from: repController.address }), true,
        "Function should return true");

    // The below assertions cannot run when onlyController modifier is applied to the issueReputation function because
    // the 'from' address of the function call cannot be another contract address in testing (Ganache doesn't know the
    // private key). Therefore to test that only the controller can access the function use the above tests and to test
    // the actual functionality of the function remove the onlyController modifier and use the below tests
    //
    // let receipt = await repToken.issueReputation(accounts[0], 100, { from: accounts[1] });
    // assert.equal(receipt.logs.length, 1, "An event should be triggered");
    // assert.equal(receipt.logs[0].event, "Issued", "The event triggered should be an Issued event");
    // assert.equal(receipt.logs[0].args._to, accounts[0], "Should be the correct to account");
    // assert.equal(receipt.logs[0].args.amount, 100, "Should emit the correct amount of reputation")
    //
    // let reputation = await repToken.reputationOf(accounts[0], { from: accounts[1] })
    // assert.equal(reputation, 100, "to account should have the correct amount of reputation")

  });

  it('should burn reputation from an account', async function () {
    let repToken = await reputationToken.deployed();
    let repController = await reputationController.deployed();

    // checks that the revert error is thrown if the burnReputation function is called by anyone but the controller
    try {
      await repToken.burnReputation.call(accounts[0], 100);
      throw(new Error("burnReputation function should only be callable by the controller"));
    } catch(error) {
      assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
    }

    assert.equal(await repToken.burnReputation.call(accounts[0], 100, { from: repController.address }), true,
        "Function should return true");

    // See note in issueReputation function test about testing this functions functionality. You must comment out the
    // code that checks the onlyController modifier in the test above (because you have to remove the onlyController
    // modifier) to test the code below because the code below uses issuesReputation to test the functionality of
    // burnReputation.
    //
    // await repToken.issueReputation(accounts[1], 100, { from: accounts[2] })
    // let receipt = await repToken.burnReputation(accounts[1], 50, { from: accounts[2] });
    // assert.equal(receipt.logs.length, 1, "An event should be triggered");
    // assert.equal(receipt.logs[0].event, "Burned", "The event triggered should be an Burned event");
    // assert.equal(receipt.logs[0].args._from, accounts[1], "Should be the correct from account");
    // assert.equal(receipt.logs[0].args.amount, 50, "Should emit the correct amount of reputation")
    //
    // let reputation = await repToken.reputationOf(accounts[1], { from: accounts[1] })
    // assert.equal(reputation, 50, "to account should have the correct amount of reputation")
  });
});
