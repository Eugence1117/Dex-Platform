var dex = artifacts.require("Dex");
var token = artifacts.require("Token");

module.exports = function(deployer){
    deployer.deploy(dex);

    deployer.deploy(token,"BTC","Bat Coin",6,99999 * (10 ** 6));
    deployer.deploy(token,"SPC","Spider Coin",6,99999 * (10 ** 6));
    deployer.deploy(token,"IRC","Erum Coin",4,99999 * (10 ** 4));
    deployer.deploy(token,"SUH","Sushi",4,99999 * (10 ** 4));
    deployer.deploy(token,"TK","Tok",4,99999 * (10 ** 4));
};