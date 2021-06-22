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
  let tokenOwner = accounts[6]
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
        [controllerOne, controllerTwo]), { from: randCaller });

    let receipt = await tokens.createToken(convToBytes32("1234"), convToBytes32("TestToken"),
        [controllerOne, controllerTwo], { from: tokenOwner });
    assert.equal(receipt.logs.length, 1, "An event should be emitted");
    assert.equal(receipt.logs[0].event, "TokenStateChanged", "The emitted event should be a TokenStateChanged event")
    assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
    assert.equal(receipt.logs[0].args._inUse, true, "The inUse var should be set to true")

    let token = await tokens.getToken(convToBytes32("TestToken"));
    assert.equal(cleanBytes(token[0]), "1234", "The _CID should be 1234 in bytes");
    assert.equal(token[1], true, "The inUse var should be true (active/in-use)");
    assert.equal(token[2], tokenOwner, "The owner should be the sender of the msg")
    // assert.isTrue(await)
  });

  it('should allow anyone to check if an address is a controller', async function () {
    let tokens = await repTokens.deployed()
    assert.isTrue(await tokens.isController(convToBytes32("TestToken"), controllerOne), { from: randCaller });
    assert.isTrue(await tokens.isController(convToBytes32("TestToken"), controllerTwo));
  });

  it('should allow controllers and the owner to issue the token', async function () {
    let tokens = await repTokens.deployed()

    // tests calling function from the token owner (in this case the owner of the deployed contract)
    assert.isTrue(await tokens.issue.call(convToBytes32("TestToken"), recAddrOne, 100, { from: tokenOwner }))

    // test using function from a controller
    assert.isTrue(await tokens.issue.call(convToBytes32("TestToken"), recAddrOne, 100, { from: controllerOne }))

    // test using function from a non-controller should throw an error
    try {
      await tokens.issue.call(convToBytes32("TestToken"), recAddrOne, 100, { from: recAddrOne })
      assert.fail("The function should not be callable by anyone but the owner of the token or its controllers")
    } catch(error) {
      assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
    }

    let receipt = await tokens.issue(convToBytes32("TestToken"), recAddrOne, 100, { from: controllerOne })
    assert.equal(receipt.logs.length, 1, "An event should be emitted");
    assert.equal(receipt.logs[0].event, "Issued", "The emitted event should be a Issued event")
    assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
    assert.equal(receipt.logs[0].args._to, recAddrOne, "The correct receiving address should be emitted")
    assert.equal(receipt.logs[0].args._amount, 100, "The amount emitted should be correct")

    assert.equal(await tokens.balanceOf(recAddrOne, convToBytes32("TestToken")), 100)

    // At the end of this test recAddrOne has 100 TestTokens
  });

  it('should allow controllers and the owner to burn a token', async function () {
    let tokens = await repTokens.deployed()
    // tests calling function from the token owner (in this case the owner of the deployed contract)
    assert.isTrue(await tokens.burn.call(convToBytes32("TestToken"), recAddrOne, 75, { from: tokenOwner }))

    // test using function from a controller
    assert.isTrue(await tokens.burn.call(convToBytes32("TestToken"), recAddrOne, 75, { from: controllerOne }))

    // test using function from a non-controller should throw an error
    try {
      await tokens.burn.call(convToBytes32("TestToken"), recAddrOne, 75, { from: recAddrOne })
      assert.fail("The function should not be callable by anyone but the owner of the token or its controllers")
    } catch(error) {
      assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
    }

    let receipt = await tokens.burn(convToBytes32("TestToken"), recAddrOne, 75, { from: controllerOne })
    assert.equal(receipt.logs.length, 1, "An event should be emitted");
    assert.equal(receipt.logs[0].event, "Burned", "The emitted event should be a Burned event")
    assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
    assert.equal(receipt.logs[0].args._from, recAddrOne, "The correct receiving address should be emitted")
    assert.equal(receipt.logs[0].args._amount.toNumber(), 75, "The amount emitted should be correct")

    assert.equal(await tokens.balanceOf(recAddrOne, convToBytes32("TestToken")), 25)

    // At the end of this test recAddrOne has 25 TestTokens
  });

  it('should allow a token owner to manage the controllers', async function () {
    let tokens = await repTokens.deployed()

    // since controllerTwo is already a valid controller for TestToken this function call should return false
    assert.isFalse(await tokens.manageController.call(convToBytes32("TestToken"), controllerTwo, true,
        { from: tokenOwner }), "The token owner should be able to call the function")

    // since controllerTwo is a valid controller for TestToken this function call should return true
    assert.isTrue(await tokens.manageController.call(convToBytes32("TestToken"), controllerTwo, false,
        { from: tokenOwner }), "The token owner should be able to call the function")

    // tests that a random caller cannot use the function
    try {
      await tokens.manageController.call(convToBytes32("TestToken"), controllerTwo, true, { from: randCaller })
      assert.fail("The previous statement must revert")
    } catch (error) {
      assert(error.message.indexOf("revert") > -1, "The error message must contain revert")
    }

    // tests that a controller of the token cannot use the function
    try {
      await tokens.manageController.call(convToBytes32("TestToken"), controllerTwo, true, { from: controllerOne })
      assert.fail("The previous statement must revert")
    } catch (error) {
      assert(error.message.indexOf("revert") > -1, "The error message must contain revert")
    }

    // remove a controller
    let receipt = await tokens.manageController(convToBytes32("TestToken"), controllerTwo, false, { from: tokenOwner })
    assert.equal(receipt.logs.length, 1, "An event should be emitted");
    assert.equal(receipt.logs[0].event, "ControllerChanged", "The emitted event should be a ControllerChanged event")
    assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
    assert.equal(receipt.logs[0].args._controller, controllerTwo, "The correct controller address should be emitted")
    assert.equal(receipt.logs[0].args._state, false, "The state emitted should be false")
    assert.isFalse(await tokens.isController(convToBytes32("TestToken"), controllerTwo))


    // test removing the same controller twice does nothing
    receipt = await tokens.manageController(convToBytes32("TestToken"), controllerTwo, false, { from: tokenOwner })
    assert.equal(receipt.logs.length, 0, "No event should be emitted");
    assert.isFalse(await tokens.isController(convToBytes32("TestToken"), controllerTwo))

    // add a controller
    receipt = await tokens.manageController(convToBytes32("TestToken"), controllerTwo, true, { from: tokenOwner })
    assert.equal(receipt.logs.length, 1, "An event should be emitted");
    assert.equal(receipt.logs[0].event, "ControllerChanged", "The emitted event should be a ControllerChanged event")
    assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
    assert.equal(receipt.logs[0].args._controller, controllerTwo, "The correct controller address should be emitted")
    assert.equal(receipt.logs[0].args._state, true, "The state emitted should be true")
    assert.isTrue(await tokens.isController(convToBytes32("TestToken"), controllerTwo))

    // test adding the same controller twice does nothing
    receipt = await tokens.manageController(convToBytes32("TestToken"), controllerTwo, true, { from: tokenOwner })
    assert.equal(receipt.logs.length, 0, "No event should be emitted");
    assert.isTrue(await tokens.isController(convToBytes32("TestToken"), controllerTwo))
  });

  it('should allow the owners to change the standard (CID) associated with their tokens', async function () {
    let tokens = await repTokens.deployed()

    // function should return true when the new/passed CID is different from the current CID
    assert.isTrue(await tokens.changeTokenStandard.call(convToBytes32("TestToken"), convToBytes32("4321"),
        { from: tokenOwner }), "The token owner should be able to call the function")

    // function should return false when the new/passed CID is the same as the current CID
    assert.isFalse(await tokens.changeTokenStandard.call(convToBytes32("TestToken"), convToBytes32("1234"),
        { from: tokenOwner }), "The token owner should be able to call the function")

    // tests that a random caller cannot use the function
    try {
      await tokens.changeTokenStandard.call(convToBytes32("TestToken"), convToBytes32("4321"),
          { from: randCaller })
      assert.fail("The previous statement must revert")
    } catch (error) {
      assert(error.message.indexOf("revert") > -1, "The error message must contain revert")
    }

    // tests that a controller of the token cannot use the function
    try {
      await tokens.changeTokenStandard.call(convToBytes32("TestToken"), convToBytes32("4321"),
          { from: controllerOne })
      assert.fail("The previous statement must revert")
    } catch (error) {
      assert(error.message.indexOf("revert") > -1, "The error message must contain revert")
    }

    let receipt = await tokens.changeTokenStandard(convToBytes32("TestToken"), convToBytes32("4321"),
        { from: tokenOwner })
    assert.equal(receipt.logs.length, 1, "An event should be emitted");
    assert.equal(receipt.logs[0].event, "TokenStandardChanged", "The emitted event should be a TokenStandardChanged event")
    assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
    let token = await tokens.getToken(convToBytes32("TestToken"))
    assert.equal(cleanBytes(token[0]), "4321", "The new CID should be correctly set")

// test that a token that is NOT inUse cannot be issued, burned, have its controllers changed, or ownership transferred
//     await tokens.createToken(convToBytes32("1234"), convToBytes32("InitializedRandToken"),
//         [controllerOne, controllerTwo], { from: tokenOwner });
//     await tokens.manageToken(convToBytes32("1234"), convToBytes32("InitializedRandToken"), false,
//         { from: tokenOwner });
//     try {
//       await tokens.issue.call(convToBytes32("InitializedRandToken"), recAddrOne, 100, { from: controllerOne })
//       assert.fail("The function should not be callable if the token is no longer in use (i.e. inUse == false)")
//     } catch(error) {
//       console.log(error)
//       assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
//     }
  });

  it('should allow owners of tokens to destroyed/soft delete their tokens', async function () {
    let tokens = await repTokens.deployed()

    // function should return true when the new/passed state is different from the current state
    assert.isTrue(await tokens.changeTokenState.call(convToBytes32("TestToken"), false,
        { from: tokenOwner }), "The token owner should be able to call the function")

    // function should return false when the new/passed CID is the same as the current CID
    assert.isFalse(await tokens.changeTokenState.call(convToBytes32("TestToken"), true,
        { from: tokenOwner }), "The token owner should be able to call the function")

    // tests that a random caller cannot use the function
    try {
      await tokens.changeTokenState.call(convToBytes32("TestToken"), false,
          { from: randCaller })
      assert.fail("The previous statement must revert")
    } catch (error) {
      assert(error.message.indexOf("revert") > -1, "The error message must contain revert")
    }

    // tests that a controller of the token cannot use the function
    try {
      await tokens.changeTokenState.call(convToBytes32("TestToken"), false,
          { from: controllerOne })
      assert.fail("The previous statement must revert")
    } catch (error) {
      assert(error.message.indexOf("revert") > -1, "The error message must contain revert")
    }

    let receipt = await tokens.changeTokenState(convToBytes32("TestToken"), false,
        { from: tokenOwner })
    assert.equal(receipt.logs.length, 1, "An event should be emitted");
    assert.equal(receipt.logs[0].event, "TokenStateChanged", "The emitted event should be a TokenStateChanged event")
    assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
    assert.equal(receipt.logs[0].args._inUse, false, "The emitted token state should be false")
    let token = await tokens.getToken(convToBytes32("TestToken"))
    assert.equal(token[1], false, "The new token state should be correctly set")

    receipt = await tokens.changeTokenState(convToBytes32("TestToken"), false,
        { from: tokenOwner })
    assert.equal(receipt.logs.length, 0, "No event should be emitted");
    token = await tokens.getToken(convToBytes32("TestToken"))
    assert.equal(token[1], false, "The new token state should be correctly set")

    // TODO: test all the functions that have the inUseOnly modifier

    // set inUse back to true
    receipt = await tokens.changeTokenState(convToBytes32("TestToken"), true,
        { from: tokenOwner })
    assert.equal(receipt.logs.length, 1, "An event should be emitted");
    assert.equal(receipt.logs[0].event, "TokenStateChanged", "The emitted event should be a TokenStateChanged event")
    assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
    assert.equal(receipt.logs[0].args._inUse, true, "The emitted token state should be true")
    token = await tokens.getToken(convToBytes32("TestToken"))
    assert.equal(token[1], true, "The new token state should be correctly set")
  });

});

function cleanBytes(string) {
  return web3.toAscii(string).replace(/\0.*$/g,'')
}

function convToBytes32(string) {
  return web3.padRight(web3.asciiToHex(string), 64)
}
