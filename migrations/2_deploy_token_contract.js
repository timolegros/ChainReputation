const repToken = artifacts.require("./reputationToken.sol");

module.exports = function (deployer) {
    // deployer.then(() => {
    //     return deployer.deploy(repController)
    //     // return deployer.deploy(repToken)
    // }).then((repControllerInstance) => {
    //     return deployer.deploy(repToken, repControllerInstance.address)
    // }).catch((error) => {
    //     console.log(error)
    // })
    deployer.then(() => {
        return deployer.deploy(repToken)
    })
}