const repTokens = artifacts.require("RepTokens");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("repTokens", function (/* accounts */) {
  it("should assert true", async function () {
    await repTokens.deployed();
    return assert.isTrue(true);
  });
});
