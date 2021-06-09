const reputationToken = artifacts.require("reputationToken");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("reputationToken", function (/* accounts */) {
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
});
