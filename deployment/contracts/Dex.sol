//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import './token.sol';
contract dex{
    
    struct Pool{
        Token token1;
        Token token2;
        uint256 token1Balance;
        uint256 token2Balance;
        bool isAdded;
    }

    mapping(address => mapping(address => uint256)) balances;
    mapping(address => Token) public tokens;
    mapping(address => Pool) public liquidityPool;
    address private owner;

    constructor(){
        owner = msg.sender;
        Token token = new Token("BTC","Bit Coin",2,100000);
        tokens[address(token)] = token;
    }
    
    function addToken(string memory symbol, string memory name)public payable onlyOwner(msg.sender) returns(address){
         Token token = new Token(symbol,name,2,100000);
         tokens[address(token)] = token;
         return address(token);
    }

    function getBalances(address token)public view returns(uint){
        return tokens[token].balanceOf(msg.sender);
    }

    function fundLiquidityPool(address payable token1, address payable token2, uint token1Amount) public payable returns(address){//isValidToken(token1) isValidToken(token2)
        require(token1 != token2,"Invalid pool");    
        address poolAddress = generatePoolId(token1,token2);
        require(isPoolExist(poolAddress),"Pool is not exist, please create a new pool.");        
        liquidityPool[poolAddress].token2Balance += computePrice(liquidityPool[poolAddress].token1Balance,liquidityPool[poolAddress].token2Balance,token1Amount);  
        liquidityPool[poolAddress].token1Balance += token1Amount;

        tokens[token1].transfer(address(this),token1Amount);
        return poolAddress;
    }

    function addLiquidityPool(address token1, address token2, uint token1Amount, uint token2Amount) public payable returns(address){
        Token from = tokens[token1];
        Token to = tokens[token2];
        address poolAddress = generatePoolId(token1,token2);

        tokens[token1].transfer(address(this),token1Amount);
        tokens[token2].transfer(address(this),token2Amount);
        liquidityPool[poolAddress] = Pool(from,to,token1Amount,token2Amount,true);
        return poolAddress;
    }

    function computePrice(uint256 x, uint256 y, uint256 amount) public pure returns(uint256){
        return y - ((x * y) / (x + amount)); //XYKModel
    }

    // function isTokenExist(address tokenAdd)private view returns(bool){
    //     return tokens[tokenAdd];
    // }

    function isPoolExist(address _address) private view returns(bool){
        Pool memory pool = liquidityPool[_address];
        return pool.isAdded;        
    }

    function generatePoolId(address token1, address token2) public pure returns (address){
        return address(uint160(uint256(keccak256(abi.encodePacked(token1, token2)))));  
    }

    function getAllToken() public view{
        //PENDING return in JSON FORM 
    }

    // modifier isValidToken(address tokenAdd){
    //     require(isTokenExist(tokenAdd),"Invalid Token.");
    //     _;
    // }

    modifier onlyOwner(address sender){
        require(sender == owner,"Only owner able to execute this action.");
        _;
    }
}