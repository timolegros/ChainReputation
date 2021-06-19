const repTokens = artifacts.require("RepTokens");
const web3 = require("web3-utils")

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("repTokens", function (accounts) {
  let ownerOne = accounts[0]
  let ownerTwo = accounts[1]
  let randCaller = accounts[2]
  let controllerOne = accounts[3]
  let controllerTwo = accounts[4]
  let recAddrOne = accounts[5]
  let zeroAddr = "0x0000000000000000000000000000000000000000"

  it("should assert true", async function () {
    await repTokens.deployed();
    return assert.isTrue(true);
  });

  it('should allow anyone to view the balance of any token for any address', async function () {
    let tokens = await repTokens.deployed()
    try {
      await tokens.balanceOf(zeroAddr, convToBytes32("RandomToken"))
      assert.fail("Previous call must throw revert error")
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
    }
    assert.equal((await tokens.balanceOf(ownerTwo, convToBytes32("RandomToken"))).toNumber(), 0,
        {from: randCaller}, "Default token balance should be 0")
  });

  it('should allow anyone to view token CID, state, and owner', async function () {
    let tokens = await repTokens.deployed()
    let token = await tokens.getToken(convToBytes32("RandomToken"), { from: randCaller})
    assert.equal(token[0], null, "The token CID should be null when uninitialized");
    assert.equal(token[1], false, "The token state should false when uninitialized");
    assert.equal(token[2], zeroAddr, "The token owner should be the 0 address when uninitialized")
  });

  it('should allow anyone to create token with any name unless that name is already in use', async function () {
    let tokens = await repTokens.deployed()

    assert.isTrue(await tokens.createToken.call(convToBytes32("1234"), convToBytes32("TestToken"),
        [controllerOne, controllerTwo]), { from: randCaller});

    let receipt = await tokens.createToken(convToBytes32("1234"), convToBytes32("TestToken"),
        [controllerOne, controllerTwo], { from: randCaller});
    assert.equal(receipt.logs.length, 1, "An event should be emitted");
    assert.equal(receipt.logs[0].event, "TokenChanged", "The emitted event should be a TokenChanged event")
    assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
    assert.equal(receipt.logs[0].args._owner, randCaller, "The token owner should be the caller of the function")
    assert.equal(receipt.logs[0].args._inUse, true, "The inUse var should be set to true")

    let token = await tokens.getToken(convToBytes32("TestToken"));
    assert.equal(cleanBytes(token[0]), "1234", "The _CID should be 1234 in bytes");
    assert.equal(token[1], true, "The inUse var should be true (active/in-use)");
    assert.equal(token[2], randCaller, "The owner should be the sender of the msg")
  });

  it('should allow controllers and owners to issue the token', async function () {
    let tokens = await repTokens.deployed()
    assert.isTrue(await tokens.issue.call(convToBytes32("TestToken"), recAddrOne))

    let receipt = await tokens.issue(convToBytes32("TestToken"), recAddrOne)

  });

});

function cleanBytes(string) {
  return web3.toAscii(string).replace(/\0.*$/g,'')
}

function convToBytes32(string) {
  return web3.padRight(web3.asciiToHex(string), 64)
}
