//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

contract dex{

    struct Token{
        string name;
        string symbol;
        address _address;
        uint256 decimals;
        string logoURI;     
        bool isAdded;   
    }

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
    }

    //Test function
    function mintToken()public payable onlyOwner(msg.sender){
    
    }

    function addToken(Token[] memory newTokens) public payable onlyOwner(msg.sender){
        for(uint256 i = 0 ; i < newTokens.length; i++){
            Token memory token = newTokens[i];
            if(!isTokenExist(token._address)){
                tokens[token._address] = token;
            }
        }
    }

    function fundLiquidityPool(address token1, address token2, uint token1Amount) public payable isValidToken(token1) isValidToken(token2){
        require(token1 != token2,"Invalid pool");
        
        address poolAddress = generatePoolId(token1,token2);
        if(!isPoolExist(poolAddress)){
            addLiquidityPool(poolAddress,token1,token2);            
        }
        liquidityPool[poolAddress].token1Balance += token1Amount;
        liquidityPool[poolAddress].token2Balance += computePrice(liquidityPool[poolAddress].token1Balance,liquidityPool[poolAddress].token2Balance,token1Amount);        
    }

    function addLiquidityPool(address poolAddress, address token1, address token2) private{
        Token storage from = tokens[token1];
        Token storage to = tokens[token2];
        liquidityPool[poolAddress] = Pool(from,to,0,0,true);
    }

    function computePrice(uint256 x, uint256 y, uint256 amount) public pure returns(uint256){
        return y - ((x * y) / (x + amount)); //XYKModel
    }

    function isTokenExist(address tokenAdd)private view returns(bool){
        return tokens[tokenAdd].isAdded;
    }

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

    modifier isValidToken(address tokenAdd){
        require(isTokenExist(tokenAdd),"Invalid Token.");
        _;
    }

    modifier onlyOwner(address sender){
        require(sender == owner,"Only owner able to execute this action.");
        _;
    }
}