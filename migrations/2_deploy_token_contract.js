const Tokens = artifacts.require("./reputationTokens.sol");

module.exports = function (deployer) {
    deployer.then(() => {
        return deployer.deploy(Tokens)
    })
}