var dex = artifacts.require("Dex");
var token1 = artifacts.require("Token");
var token2 = artifacts.require("Token");
var token3 = artifacts.require("Token");
var token4 = artifacts.require("Token");
var token5 = artifacts.require("Token");

module.exports = function(deployer){
    deployer.deploy(dex);

    // deployer.deploy(token1,"BTC","Bat Coin",6,99999 * (10 ** 6));
    // deployer.deploy(token2,"SPC","Spider Coin",6,99999 * (10 ** 6));
    // deployer.deploy(token3,"IRC","Erum Coin",4,99999 * (10 ** 4));
    // deployer.deploy(token4,"SUH","Sushi",4,99999 * (10 ** 4));
    // deployer.deploy(token5,"TK","Tok",4,99999 * (10 ** 4));
};