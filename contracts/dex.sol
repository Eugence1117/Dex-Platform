//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import './token.sol';
contract dex{

    struct Pool{
        address token1;
        address token2;
        uint256 token1Balance;
        uint256 token2Balance;
        uint token1Interest;
        uint token2Interest;        
        bool isAdded;
    }

    struct Fee{
        address poolAddress;
        address tokenAddress;
        uint accumulatedFee;
    }

    //wallet address => token address => balance
    mapping(address => mapping(address => uint256)) balances; //not necessary

    //pool address => token address => wallet => balances
    mapping(address => mapping(address => mapping(address => uint))) liquidity;
    //wallet address => token address => pool address => balance
    //mapping(address => mapping(address => mapping(address => uint256))) liquidity;
    mapping(address => Token) public tokens;
    mapping(address => Pool) public liquidityPool;
    address private owner;

    //Token public poolToken;
    event Response(address sender, string message, address contractAddress);

    constructor(){                                                                          
        owner = msg.sender;
        //poolToken = new Token("DEX","DEX TOKEN",4,1000000000);
        //tokens[address(poolToken)] = poolToken;

        Token token = new Token("BTC","Bit Coin",2,100000);
        tokens[address(token)] = token;
    }
    
    function addToken(string memory symbol, string memory name)public payable onlyOwner(msg.sender) returns(address){
         Token token = new Token(symbol,name,2,100000);
         tokens[address(token)] = token;
         emit Response(msg.sender,"New Token added",address(token));
         return address(token);
    }

    function calculateInterest(uint tokenAmount,uint poolAmount,uint accumulatedInterest)public pure returns(uint){
        return tokenAmount * accumulatedInterest / poolAmount;        
    }
    
    function getContractBalance()public view returns(uint){
        return address(this).balance;
    }

    function getBalances(address token)public view returns(uint){
        return tokens[token].balanceOf(msg.sender);                                                                                   
    }
    // function checkPoolTokenSupply()public view returns(uint){
    //     return poolToken.totalSupply();
    // }

    // function mintPoolToken(address receiver, uint amount)public payable{
    //     require(poolToken.totalSupply() >= 0 , "No more token left.");
    //     if(poolToken.totalSupply() < amount){
    //         poolToken.transfer(receiver,poolToken.totalSupply());
    //     }
    //     else{
    //         poolToken.transfer(receiver,amount);
    //     }
    // }

    function fundLiquidityPool(address payable token1, address payable token2, uint token1Amount) public payable returns(address){//isValidToken(token1) isValidToken(token2)
        require(token1 != token2,"Invalid pool");    
        address poolAddress = generatePoolId(token1,token2);
        require(isPoolExist(poolAddress),"Pool is not exist, please create a new pool.");        
        uint token2Amount = computePrice(liquidityPool[poolAddress].token1Balance,liquidityPool[poolAddress].token2Balance,token1Amount);  
        liquidityPool[poolAddress].token2Balance += token2Amount;
        liquidityPool[poolAddress].token1Balance += token1Amount;

        //Add liquidity
        liquidity[poolAddress][token1][msg.sender] += token1Amount;
        liquidity[poolAddress][token2][msg.sender] += token2Amount;

        tokens[token1].transferFrom(msg.sender, address(this),token1Amount);
        tokens[token2].transferFrom(msg.sender, address(this),token2Amount);
        return poolAddress;
    }

    function addLiquidityPool(address token1, address token2, uint token1Amount, uint token2Amount) public payable returns(address){
        address poolAddress = generatePoolId(token1,token2);

        tokens[token1].transferFrom(msg.sender,address(this),token1Amount);
        tokens[token2].transferFrom(msg.sender,address(this),token2Amount);
        liquidityPool[poolAddress] = Pool(token1,token2,token1Amount,token2Amount,0,0,true);
        return poolAddress;
    }

    function withdrawFund(address pool, uint amount)public payable{        
        uint token1Balance = liquidityPool[pool].token1Balance;
        uint token2Balance = liquidityPool[pool].token2Balance;

        uint token1Fund = liquidity[pool][liquidityPool[pool].token1][msg.sender] * amount / 100;
        uint token2Fund = liquidity[pool][liquidityPool[pool].token2][msg.sender] * amount / 100;

        uint token1Received = calculateInterest(token1Fund,token1Balance,liquidityPool[pool].token1Interest) + token1Fund;
        uint token2Received = calculateInterest(token2Fund,token2Balance,liquidityPool[pool].token2Interest) + token2Fund;

        tokens[liquidityPool[pool].token1].transfer(msg.sender,token1Received);
        tokens[liquidityPool[pool].token2].transfer(msg.sender,token2Received);
        //amount in percentage        
    }
    
    function computePrice(uint256 x, uint256 y, uint256 amount) public pure returns(uint256){
        return y - ((x * y) / (x + amount)); //XYKModel
    }

    // function isTokenExist(address tokenAdd)private view returns(bool){
    //     return tokens[tokenAdd];
    // }

    function isPoolExist(address _address) private view returns(bool){
        Pool memory pool = liquidityPool[_address];
        return pool.isAdded || (pool.token1Balance == 0 && pool.token2Balance == 0);        
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