const repTokensContract = artifacts.require("RepTokens");
const web3 = require("web3-utils")

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */

// TODO: once a token name/id has been used it cannot be removed since the mapping remains and another token could change the name but keep the balances
// TODO: test removing the first oracle in the list and then check order
contract("repTokens", function (accounts) {
  let ownerOne = accounts[0]
  let recAddrTwo = accounts[1]
  let randCaller = accounts[2]
  let oracleOne = accounts[3]
  let oracleTwo = accounts[4]
  let recAddrOne = accounts[5]
  let tokenOwner = accounts[6]
  let tokenOwnerTwo = accounts[7]
  let zeroAddr = "0x0000000000000000000000000000000000000000"
  let repTokens;

  it("should assert true", async function () {
    repTokens = await repTokensContract.deployed();
    return assert.isTrue(true);
  });

  describe('Tests for creating a token', () => {
    it('Access: anyone', async () => {

      assert.isTrue(await repTokens.createToken.call(convToBytes32("1234"), convToBytes32("TestToken"),
          [oracleOne, oracleTwo]), { from: randCaller });
    })

    it('Functionality: Creates a token', async () => {
      let receipt = await repTokens.createToken(convToBytes32("1234"), convToBytes32("TestToken"),
          [oracleOne, oracleTwo], { from: tokenOwner });

      assert.equal(receipt.logs.length, 1, "An event should be emitted");
      assert.equal(receipt.logs[0].event, "TokenStateChanged", "The emitted event should be a TokenStateChanged event")
      assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
      assert.equal(receipt.logs[0].args._state, 1, "The state var should be set to 1 (ACTIVE)")

      let token = await repTokens.tokens(convToBytes32("TestToken"));
      assert.equal(cleanBytes(token[0]), "1234", "The _CID should be 1234 in bytes");
      assert.equal(token[1].toNumber(), 1, "The state var should be 1 (ACTIVE)");
      assert.equal(token[2], tokenOwner, "The owner should be the sender of the msg")

      let oracleArr = await repTokens.getOracles(convToBytes32("TestToken"));
      assert.equal(oracleArr[0], oracleOne);
      assert.equal(oracleArr[1], oracleTwo);
      assert.equal(oracleArr.length, 2);
    })

    it('Edge case: cannot create token if the name is used by another token', async () => {
      try {
        await repTokens.createToken(convToBytes32("1234"), convToBytes32("TestToken"),
            [oracleOne, oracleTwo], { from: tokenOwner });
        assert.fail("Cannot create a token with the same name")
      } catch (error) {
        assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
      }
    })
  })

  describe("Tests for issuing a token", () => {
    it("Access: oracles + owner", async () => {

      // tests calling function from the token owner
      assert.isTrue(await repTokens.issue.call(convToBytes32("TestToken"), recAddrOne, 100, { from: tokenOwner }))

      // test using function from an oracle
      assert.isTrue(await repTokens.issue.call(convToBytes32("TestToken"), recAddrOne, 100, { from: oracleOne }))

      // test using function from a non-oracle address should throw an error
      try {
        await repTokens.issue.call(convToBytes32("TestToken"), recAddrOne, 100, { from: recAddrOne })
        assert.fail("The function should not be callable by anyone but the owner of the token or its controllers")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }
    })

    it('Functionality: Should issue tokens', async () => {
      // oracleOne
      let receipt = await repTokens.issue(convToBytes32("TestToken"), recAddrOne, 100, { from: oracleOne })
      assert.equal(receipt.logs.length, 1, "An event should be emitted");
      assert.equal(receipt.logs[0].event, "Issued", "The emitted event should be a Issued event")
      assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
      assert.equal(receipt.logs[0].args._to, recAddrOne, "The correct receiving address should be emitted")
      assert.equal(receipt.logs[0].args._amount, 100, "The amount emitted should be correct")

      assert.equal(await repTokens.balanceOf(recAddrOne, oracleOne, convToBytes32("TestToken")), 100)

      // oracleTwo
      receipt = await repTokens.issue(convToBytes32("TestToken"), recAddrOne, 100, { from: oracleTwo })
      assert.equal(receipt.logs.length, 1, "An event should be emitted");
      assert.equal(receipt.logs[0].event, "Issued", "The emitted event should be a Issued event")
      assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
      assert.equal(receipt.logs[0].args._to, recAddrOne, "The correct receiving address should be emitted")
      assert.equal(receipt.logs[0].args._amount, 100, "The amount emitted should be correct")

      assert.equal(await repTokens.balanceOf(recAddrOne, oracleTwo, convToBytes32("TestToken")), 100)

      // At the end of this test recAddrOne has 100 TestTokens issued by oracleOne amd 100 issued by oracleTwo
    });

    it('Edge case: cannot issue negative reputation', async () => {
      // test using function from a non-oracle address should throw an error
      try {
        await repTokens.issue(convToBytes32("TestToken"), recAddrOne, -100, { from: oracleOne })
        assert.fail("The function should not be callable by anyone but the owner of the token or its controllers")
      } catch(error) {
        assert.equal(error.code, 'INVALID_ARGUMENT', "The function call should throw invalid argument")
      }
    })
  })

  describe("Tests for burning a token", () => {
    it('Access: oracles + owner', async () => {
      // tests calling function from the token owner (in this case the owner of the deployed contract)
      assert.isTrue(await repTokens.burn.call(convToBytes32("TestToken"), recAddrOne, 75, { from: tokenOwner }))

      // test using function from a controller
      assert.isTrue(await repTokens.burn.call(convToBytes32("TestToken"), recAddrOne, 75, { from: oracleOne }))

      // test using function from a non-controller should throw an error
      try {
        await repTokens.burn.call(convToBytes32("TestToken"), recAddrOne, 75, { from: recAddrOne })
        assert.fail("The function should not be callable by anyone but the owner of the token or its controllers")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }
    })

    it('Functionality: Should burn tokens', async function () {
      let receipt = await repTokens.burn(convToBytes32("TestToken"), recAddrOne, 75, { from: oracleOne });
      assert.equal(receipt.logs.length, 1, "An event should be emitted");
      assert.equal(receipt.logs[0].event, "Burned", "The emitted event should be a Burned event");
      assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken");
      assert.equal(receipt.logs[0].args._from, recAddrOne, "The correct receiving address should be emitted");
      assert.equal(receipt.logs[0].args._amount.toNumber(), 75, "The amount emitted should be correct");

      assert.equal(await repTokens.balanceOf(recAddrOne, oracleOne, convToBytes32("TestToken")), 25);

      // At the end of this test recAddrOne has 25 TestTokens issued by oracleOne and 100 TestTokens issued by oracleTwo
    });

    it('Edge case: cannot burn past 0', async () => {
      assert.equal(await repTokens.balanceOf(recAddrTwo, oracleOne, convToBytes32("TestToken")), 0);

      let receipt = await repTokens.burn(convToBytes32("TestToken"), recAddrTwo, 100, { from: oracleOne });
      assert.equal(receipt.logs.length, 1, "An event should be emitted");
      assert.equal(receipt.logs[0].event, "Burned", "The emitted event should be a Burned event");
      assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken");
      assert.equal(receipt.logs[0].args._from, recAddrTwo, "The correct receiving address should be emitted");
      assert.equal(receipt.logs[0].args._amount.toNumber(), 0, "The amount emitted should be correct");

      assert.equal(await repTokens.balanceOf(recAddrTwo, oracleOne, convToBytes32("TestToken")), 0);
    })

    it('Edge case: cannot burn a negative amount', async () => {
      // test using function from a non-oracle should throw an error
      try {
        await repTokens.burn(convToBytes32("TestToken"), recAddrOne, -10, { from: oracleOne })
        assert.fail("The function should not be callable by anyone but the owner of the token or its controllers")
      } catch(error) {
        assert.equal(error.code, 'INVALID_ARGUMENT', "The function call should throw invalid argument")
      }
    })
  })

  describe("Tests for removing oracles", () => {
    it('Access: only token owner', async () => {
      try {
        await repTokens.removeOracle(convToBytes32("TestToken"), oracleTwo, { from: oracleOne })
        assert.fail("The function should not be callable by anyone but the owner of the token")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }

      try {
        await repTokens.removeOracle(convToBytes32("TestToken"), oracleTwo, { from: randCaller })
        assert.fail("The function should not be callable by anyone but the owner of the token")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }

      assert.isTrue(await repTokens.removeOracle.call(convToBytes32("TestToken"), oracleTwo, { from: tokenOwner }))
    })

    it('Functionality: should remove an oracle from a token', async () => {
      let receipt = await repTokens.removeOracle(convToBytes32("TestToken"), oracleTwo, { from: tokenOwner })
      assert.equal(receipt.logs.length, 1, "An event should be emitted");
      assert.equal(receipt.logs[0].event, "OracleRemoved", "The emitted event should be a OracleRemoved event");
      assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken");
      assert.equal(receipt.logs[0].args._oracle, oracleTwo, "The correct receiving address should be emitted");

      let token = await repTokens.tokens(convToBytes32("TestToken"));
      assert.equal(cleanBytes(token[0]), "1234", "The _CID should be 1234 in bytes");
      assert.equal(token[1], 1, "The state var should be 1 (ACTIVE)");
      assert.equal(token[2], tokenOwner, "The owner should be correct");

      let oracleArr = await repTokens.getOracles(convToBytes32("TestToken"));
      assert.equal(oracleArr[0], oracleOne);
      assert.equal(oracleArr.length, 1);

      // at the end of this test "TestToken" only has oracleOne in its oracles_ array
    })

    it("Edge case: cannot remove an oracle that isn't authorized", async () => {
      try {
        await repTokens.removeOracle(convToBytes32("TestToken"), oracleTwo, { from: tokenOwner })
        assert.fail("The function should fail if the passed oracle is not authorized for the given token")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }
    })
  })

  describe("Tests for adding oracles", () => {
    it('Access: only token owner', async () => {
      try {
        await repTokens.addOracle(convToBytes32("TestToken"), recAddrOne, { from: oracleOne })
        assert.fail("The function should not be callable by anyone but the owner of the token or its controllers")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }

      try {
        await repTokens.addOracle(convToBytes32("TestToken"), recAddrOne, { from: randCaller })
        assert.fail("The function should not be callable by anyone but the owner of the token or its controllers")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }

      assert.isTrue(await repTokens.addOracle.call(convToBytes32("TestToken"), oracleTwo, { from: tokenOwner }))
    })

    it('Functionality: should add an oracle to a token', async () => {
      let receipt = await repTokens.addOracle(convToBytes32("TestToken"), oracleTwo, { from: tokenOwner })
      assert.equal(receipt.logs.length, 1, "An event should be emitted");
      assert.equal(receipt.logs[0].event, "OracleAdded", "The emitted event should be a OracleAdded event");
      assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken");
      assert.equal(receipt.logs[0].args._oracle, oracleTwo, "The correct receiving address should be emitted");

      let token = await repTokens.tokens(convToBytes32("TestToken"));
      assert.equal(cleanBytes(token[0]), "1234", "The _CID should be 1234 in bytes");
      assert.equal(token[1], 1, "The state var should be 1 (ACTIVE)");
      assert.equal(token[2], tokenOwner, "The owner should be correct");

      let oracleArr = await repTokens.getOracles(convToBytes32("TestToken"));
      assert.equal(oracleArr[0], oracleOne);
      assert.equal(oracleArr[1], oracleTwo);
      assert.equal(oracleArr.length, 2);

      // at the end of this test "TestToken" has oracleOne and oracleTwo in its oracles_ array
    })

    it("Edge case: cannot add an oracle that is already authorized", async () => {
      try {
        await repTokens.addOracle(convToBytes32("TestToken"), oracleTwo, { from: tokenOwner })
        assert.fail("The function should fail if the passed oracle is already authorized for the given token")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }
    })
  })

  describe("Tests for getting the true on-chain balance", () => {
    it('Access: anyone', async () => {
      assert.equal(await repTokens.trueBalanceOf(recAddrTwo, convToBytes32("TestToken"), { from: tokenOwner }), 0)
      assert.equal(await repTokens.trueBalanceOf(recAddrTwo, convToBytes32("TestToken"), { from: recAddrOne }), 0);
      assert.equal(await repTokens.trueBalanceOf(recAddrTwo, convToBytes32("TestToken"), { from: recAddrTwo }), 0);
      assert.equal(await repTokens.trueBalanceOf(recAddrTwo, convToBytes32("TestToken"), { from: oracleOne }), 0);
      assert.equal(await repTokens.trueBalanceOf(recAddrTwo, convToBytes32("TestToken"), { from: oracleTwo }), 0);
    })

    it('Functionality: calculate the true balance across all oracles', async () => {
      assert.equal(await repTokens.trueBalanceOf(recAddrOne, convToBytes32("TestToken")), 125,
          "recAddrOne should have 100 tokens issued from oracleTwo and 25 tokens issued from oracleOne");
      assert.equal(await repTokens.trueBalanceOf(recAddrTwo, convToBytes32("TestToken")), 0,
          "recAddrTwo should have 0 tokens from either oracle");
    })

    it('Edge case: cannot query the zero address', async () => {
      try {
        await repTokens.trueBalanceOf(zeroAddr, convToBytes32("RandomToken"))
        assert.fail("Cannot query the balance of the zero address")
      } catch (error) {
        assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
      }
    })
  })

  // TODO: Move this earlier since it is used in previous tests
  describe("Tests for getting the balance of a user issued by a specific oracle", () => {
    it('Access: anyone', async () => {
      assert.equal(await repTokens.balanceOf(recAddrTwo, oracleTwo, convToBytes32("TestToken"), { from: tokenOwner }), 0)
      assert.equal(await repTokens.balanceOf(recAddrTwo, oracleTwo, convToBytes32("TestToken"), { from: recAddrOne }), 0);
      assert.equal(await repTokens.balanceOf(recAddrTwo, oracleTwo, convToBytes32("TestToken"), { from: recAddrTwo }), 0);
      assert.equal(await repTokens.balanceOf(recAddrTwo, oracleTwo, convToBytes32("TestToken"), { from: oracleOne }), 0);
      assert.equal(await repTokens.balanceOf(recAddrTwo, oracleTwo, convToBytes32("TestToken"), { from: oracleTwo }), 0);
    })

    it('Functionality: gets the balance of a user for a specific token and oracle', async () => {
      assert.equal(await repTokens.balanceOf(recAddrOne, oracleTwo, convToBytes32("TestToken")), 100);
      assert.equal(await repTokens.balanceOf(recAddrOne, oracleOne, convToBytes32("TestToken")), 25);
    })

    it('Edge case: cannot query the zero address', async () => {
      try {
        await repTokens.balanceOf(zeroAddr, oracleTwo, convToBytes32("TestToken"));
        assert.fail("Cannot query the balance of the zero address")
      } catch (error) {
        assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
      }
    })
  })

  describe("Tests for getting token data", () => {
    it('Access: anyone', async () => {
      assert.equal((await repTokens.tokens(convToBytes32("TestToken"), { from: tokenOwner }))[0], convToBytes32("1234"));
      assert.equal((await repTokens.tokens(convToBytes32("TestToken"), { from: recAddrOne }))[0], convToBytes32("1234"));
      assert.equal((await repTokens.tokens(convToBytes32("TestToken"), { from: recAddrTwo }))[0], convToBytes32("1234"));
      assert.equal((await repTokens.tokens(convToBytes32("TestToken"), { from: randCaller }))[0], convToBytes32("1234"));
    })
    it('Functionality: gets token data', async () => {
      let token = await repTokens.tokens(convToBytes32("RandomToken"));
      assert.equal(token[0], null, "The token CID should be null when uninitialized");
      assert.equal(token[1], 0, "The token state should 0 (NULL) when uninitialized");
      assert.equal(token[2], zeroAddr, "The token owner should be the 0 address when uninitialized");
      let oracleArr = await repTokens.getOracles(convToBytes32("RandomToken"));
      assert.equal(oracleArr.length, 0);

      token = await repTokens.tokens(convToBytes32("TestToken"));
      assert.equal(cleanBytes(token[0]), "1234", "The _CID should be 1234 in bytes");
      assert.equal(token[1], 1, "The state var should be 1 (ACTIVE)");
      assert.equal(token[2], tokenOwner, "The owner should be the sender of the msg")
      oracleArr = await repTokens.getOracles(convToBytes32("TestToken"));
      assert.equal(oracleArr[0], oracleOne);
      assert.equal(oracleArr[1], oracleTwo);
      assert.equal(oracleArr.length, 2);
    })
  })

  describe("Tests for changing token CID", () => {
    it("Access: only token owner", async () => {

      try {
        await repTokens.changeTokenStandard.call(convToBytes32("TestToken"), convToBytes32("4321"), { from: oracleOne })
        assert.fail("The function should not be callable by anyone but the owner of the token")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }

      try {
        await repTokens.changeTokenStandard.call(convToBytes32("TestToken"), convToBytes32("4321"), { from: randCaller })
        assert.fail("The function should not be callable by anyone but the owner of the token")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }

      assert.isTrue(await repTokens.changeTokenStandard.call(
          convToBytes32("TestToken"),
          convToBytes32("4321"),
          { from: tokenOwner }))
    })

    it("Functionality: should change the token CID", async () => {

      let receipt = await repTokens.changeTokenStandard(convToBytes32("TestToken"), convToBytes32("4321"),
          { from: tokenOwner });
      assert.equal(receipt.logs.length, 1, "An event should be emitted");
      assert.equal(receipt.logs[0].event, "TokenStandardChanged", "The emitted event should be a TokenStandardChanged event")
      assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")

      let token = await repTokens.tokens(convToBytes32("TestToken"));
      assert.equal(cleanBytes(token[0]), "4321", "The _CID should be 1234 in bytes");
      assert.equal(token[1], 1, "The state var should be 1 (ACTIVE)");
      assert.equal(token[2], tokenOwner, "The owner should be the sender of the msg")

      let oracleArr = await repTokens.getOracles(convToBytes32("TestToken"));
      assert.equal(oracleArr[0], oracleOne);
      assert.equal(oracleArr[1], oracleTwo);
      assert.equal(oracleArr.length, 2);
    })

    it("Edge case: cannot change token CID to the same CID", async () => {
      try {
        await repTokens.changeTokenStandard(convToBytes32("TestToken"), convToBytes32("4321"), { from: tokenOwner })
        assert.fail("The function should not be callable by anyone but the owner of the token or its controllers")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }
    })
  })

  describe("Tests for change token state", () => {
    it("Access: only token owner", async () => {
      try {
        await repTokens.changeTokenState.call(convToBytes32("TestToken"), 2, { from: oracleOne })
        assert.fail("The function should not be callable by anyone but the owner")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }

      try {
        await repTokens.changeTokenState.call(convToBytes32("TestToken"), 2, { from: randCaller })
        assert.fail("The function should not be callable by anyone but the owner")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }

      assert.isTrue(await repTokens.changeTokenState.call(convToBytes32("TestToken"), 2, { from: tokenOwner }))
    })

    it("Functionality: should change the token state", async () => {
      let receipt = await repTokens.changeTokenState(convToBytes32("TestToken"), 2, { from: tokenOwner });
      assert.equal(receipt.logs.length, 1, "An event should be emitted");
      assert.equal(receipt.logs[0].event, "TokenStateChanged", "The emitted event should be a TokenStateChanged event")
      assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
      assert.equal(receipt.logs[0].args._state, 2, "The correct token state should be emitted")

      let token = await repTokens.tokens(convToBytes32("TestToken"));
      assert.equal(cleanBytes(token[0]), "4321", "The _CID should be 1234 in bytes");
      assert.equal(token[1], 2, "The state var should be 2 (INACTIVE)");
      assert.equal(token[2], tokenOwner, "The owner should be the sender of the msg")

      let oracleArr = await repTokens.getOracles(convToBytes32("TestToken"));
      assert.equal(oracleArr[0], oracleOne);
      assert.equal(oracleArr[1], oracleTwo);
      assert.equal(oracleArr.length, 2);
    })

    it("Edge case: cannot change token state to the same state", async () => {
      try {
        await repTokens.changeTokenState.call(convToBytes32("TestToken"), 2, { from: tokenOwner })
        assert.fail("The function should not be callable by anyone but the owner")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }
    })
  })

  describe("Tests for transferring token ownership", () => {
    it("Access: only token owner", async () => {
      try {
        await repTokens.transferOwnership.call(convToBytes32("TestToken"), tokenOwnerTwo, { from: oracleOne })
        assert.fail("The function should not be callable by anyone but the owner")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }

      try {
        await repTokens.transferOwnership.call(convToBytes32("TestToken"), tokenOwnerTwo, { from: randCaller })
        assert.fail("The function should not be callable by anyone but the owner")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }

      assert.isTrue(await repTokens.transferOwnership.call(convToBytes32("TestToken"), tokenOwnerTwo, { from: tokenOwner }))
    })
    it("Functionality: should change the token owner", async () => {
      let receipt = await repTokens.transferOwnership(convToBytes32("TestToken"), tokenOwnerTwo, { from: tokenOwner });
      assert.equal(receipt.logs.length, 1, "An event should be emitted");
      assert.equal(receipt.logs[0].event, "OwnerChanged", "The emitted event should be a OwnerChanged event")
      assert.equal(cleanBytes(receipt.logs[0].args._tokenName), "TestToken", "The emitted token name should be TestToken")
      assert.equal(receipt.logs[0].args._from, tokenOwner)
      assert.equal(receipt.logs[0].args._to, tokenOwnerTwo)


      let token = await repTokens.tokens(convToBytes32("TestToken"));
      assert.equal(cleanBytes(token[0]), "4321", "The _CID should be 1234 in bytes");
      assert.equal(token[1], 2, "The state var should be 2 (INACTIVE)");
      assert.equal(token[2], tokenOwnerTwo, "The owner should be the sender of the msg");

      let oracleArr = await repTokens.getOracles(convToBytes32("TestToken"));
      assert.equal(oracleArr[0], oracleOne);
      assert.equal(oracleArr[1], oracleTwo);
      assert.equal(oracleArr.length, 2);
    })

    it("Edge case: cannot change token owner to the same owner", async () => {
      try {
        await repTokens.transferOwnership.call(convToBytes32("TestToken"), tokenOwnerTwo, { from: tokenOwner })
        assert.fail("The function should not be callable by anyone but the owner")
      } catch(error) {
        assert(error.message.indexOf("revert") > -1, "The message should be a revert message")
      }
    })
  })
});

function cleanBytes(string) {
  return web3.toAscii(string).replace(/\0.*$/g,'')
}

function convToBytes32(string) {
  return web3.padRight(web3.asciiToHex(string), 64)
}
