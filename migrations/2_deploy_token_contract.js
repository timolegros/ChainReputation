const repToken = artifacts.require("./reputationToken.sol");
const repController = artifacts.require("./reputationController.sol")

module.exports = function (deployer) {
    deployer.then(() => {
        return deployer.deploy(repController)
        // return deployer.deploy(repToken)
    }).then((repControllerInstance) => {
        return deployer.deploy(repToken, repControllerInstance.address)
    }).catch((error) => {
        console.log(error)
    })
}