const repTokens = artifacts.require("RepTokens");

module.exports = function(deployer) {
  deployer.then(() => {
      return deployer.deploy(repTokens);
  })
};
