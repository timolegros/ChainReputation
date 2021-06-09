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

    // checks that the revert error is thrown if the issueReputation is called by anyone but the controller
    try {
      await repToken.issueReputation.call(accounts[0], 100);
      throw(new Error("issueReputation function should only be callable by the controller"));
    } catch(error) {
      assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
    }

    assert.equal(await repToken.issueReputation.call(accounts[0], 100, { from: repController.address }), true,
        "Function should return true");

    let receipt = await repToken.issueReputation(repController.address, 100, { from: repController.address });


  });
});
