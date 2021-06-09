const repToken = artifacts.require("./reputationToken.sol");

module.exports = function (deployer) {
    deployer.then(() => {
        return deployer.deploy(repToken)
    })
}