const RepFactory = artifacts.require("RepFactory");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("RepFactory", function (/* accounts */) {
  it("should assert true", async function () {
    await RepFactory.deployed();
    return assert.isTrue(true);
  });
});
