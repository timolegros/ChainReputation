const reputationToken = artifacts.require("reputationToken");
const reputationController = artifacts.require("reputationController")

contract("reputationController", function (accounts) {
    // it('should have the correct owner', async function () {
    //     let repController = await reputationController.deployed();
    //
    //     console.log("Owner>>>>", await repController.owner())
    //     // console.log("Controller>>>>>>", await repToken.controller())
    // });
    let owner = accounts[0]
    let receivingAcc = accounts[1]
    let callingAcc = accounts[5]

    it("Checks that contract deploys", async function () {
        await reputationController.deployed();
        return assert.isTrue(true);
    });

    it('should set the contract name and version', async function () {
        let repController = await reputationController.deployed()
        assert.equal(await repController.name(), "RepController");
        assert.equal(await repController.version(), "v1");
    });

    it('should define like standard', async function () {
        let repController = await reputationController.deployed();

        try {
            await repController.likeStandard.call(receivingAcc, { from: callingAcc });
            throw new Error("Only admins should be able to call this standard")
        } catch (error) {
            assert(error.message.indexOf("revert") >= 0, "Error message must contain revert")
        }

        assert.equal(await repController.likeStandard.call(receivingAcc), true, { from: owner })
    });
})