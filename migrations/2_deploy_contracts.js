var ElectionFactory = artifacts.require("./ElectionFactory.sol");

module.exports = function(deployer) {
  deployer.deploy(ElectionFactory);
};
