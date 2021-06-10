const reputationToken = artifacts.require("reputationToken");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */

// the owner for any call is by default owner
contract("reputationToken", function (accounts) {
  let owner = accounts[0];
  let receivingAcc = accounts[1];
  let callingAcc = accounts[5];

  it("Checks that the contract deploys without errors", async function () {
    await reputationToken.deployed();
    return assert.isTrue(true);
  });

  it('should set the token name, symbol, and granularity', async function () {
    let repToken = await reputationToken.deployed();
    assert.equal(await repToken.name(), "Reputation");
    assert.equal(await repToken.symbol(), "Rep");
    assert.equal(await repToken.version(), "v1");
    assert.equal(await repToken.granularity(), 1);
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

    //TODO: Test that issueReputation is callable by an admin

    // tests that the function is callable by the owner/deployer
    assert.equal(await repToken.issueReputation.call(owner, 100, { from: owner }), true,
        "Function should return true");

    let receipt = await repToken.issueReputation(owner, 100, { from: owner });
    assert.equal(receipt.logs.length, 1, "An event should be triggered");
    assert.equal(receipt.logs[0].event, "Issued", "The event triggered should be an Issued event");
    assert.equal(receipt.logs[0].args._to, owner, "Should be the correct to account");
    assert.equal(receipt.logs[0].args.amount, 100, "Should emit the correct amount of reputation")

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

    // TODO: test that the burnReputation function is callabled by an admin

    // tests that the function is callable by the owner/deployer
    assert.equal(await repToken.burnReputation.call(owner, 100, { from: owner }), true,
        "Function should return true");


    await repToken.issueReputation(receivingAcc, 100, { from: owner })
    let receipt = await repToken.burnReputation(receivingAcc, 50, { from: owner });
    assert.equal(receipt.logs.length, 1, "An event should be triggered");
    assert.equal(receipt.logs[0].event, "Burned", "The event triggered should be an Burned event");
    assert.equal(receipt.logs[0].args._from, receivingAcc, "Should be the correct from account");
    assert.equal(receipt.logs[0].args.amount, 50, "Should emit the correct amount of reputation")

    let reputation = await repToken.reputationOf(receivingAcc, { from: owner })
    assert.equal(reputation, 50, "to account should have the correct amount of reputation")
  });

});
