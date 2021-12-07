//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import "./token.sol";
//import "hardhat/console.sol";

contract dex{
    struct Pool{
        address poolToken;
        address token1;
        address token2;
        uint256 token1Balance;
        uint256 token2Balance;                      
        bool isAdded;
    }

    mapping(address => Pool) public liquidityPool;
    address private owner;
    
    event Response(address sender, string message, address contractAddress);

    constructor(){                                                                          
        owner = msg.sender;
    }
    
    // /*FUNCTION TO BE REMOVED*/
    // function createToken()public payable returns(address){
    //     Token token = new Token("BTC","BitCoin",4,10000000);
    //     return address(token);
    // }
        
    // function getContractBalance()public view returns(uint){
    //     return address(this).balance;
    // }

    // function mintToken(address to, address token, uint amount)public payable{
    //     require(amount <= tokens[token].totalSupply(),"Not enough supply.");
    //     tokens[token].transfer(to,amount);
    // }

    // function transferTest(uint amount, address token)public payable{
    //     require(tokens[token].transferFrom(msg.sender,address(this),amount));
    // }

    // function getAllToken() public view{
    //     //PENDING return in JSON FORM 
    // }

    // /*END FUNCTION TO BE REMOVED*/


    // function importToken(address tokenAddress)public {
    //     tokens[tokenAddress] = ERC20Interface(tokenAddress);
    // }

    function getBalances(address token)public view returns(uint){
        return ERC20Interface(token).balanceOf(msg.sender);
    }

    function fundLiquidityPool(address payable token1, address payable token2, uint token1Amount) public payable returns(address){//isValidToken(token1) isValidToken(token2)
        require(token1 != token2,"Invalid pool");    
        address poolAddress = generatePoolId(token1,token2);
        require(isPoolExist(poolAddress),"Pool is not exist, please create a new pool.");        
        
        uint token2Amount = computePrice(liquidityPool[poolAddress].token1Balance,liquidityPool[poolAddress].token2Balance,token1Amount);  

        liquidityPool[poolAddress].token2Balance += token2Amount;
        liquidityPool[poolAddress].token1Balance += token1Amount;

        //Add liquidity
        ERC20Interface poolToken = ERC20Interface(liquidityPool[poolAddress].poolToken);
        
        uint tokenReceived = calculateLPToken(false,token1Amount,token2Amount,liquidityPool[poolAddress].token1Balance,liquidityPool[poolAddress].token2Balance,poolToken.totalSupply());
              
        require(poolToken.mint(msg.sender,tokenReceived),"Transaction failed.");
        //require(poolToken.transfer(msg.sender,tokenReceived),"Transaction failed.");

        ERC20Interface tokenA = ERC20Interface(token1);
        ERC20Interface tokenB = ERC20Interface(token2);

        tokenA.transferFrom(msg.sender, address(this),token1Amount);
        tokenB.transferFrom(msg.sender, address(this),token2Amount);
        return poolAddress;
    }

    function addLiquidityPool(address payable token1, address payable token2, uint token1Amount, uint token2Amount) public payable returns(address,address){
        require(token1 != token2,"Invalid liquidity pool.");
        address poolAddress = generatePoolId(token1,token2);

        require(!liquidityPool[poolAddress].isAdded,"Pool already exist");
        //need to call approve first
        ERC20Interface tokenA = ERC20Interface(token1);
        ERC20Interface tokenB = ERC20Interface(token2);

        require(tokenA.allowance(msg.sender, address(this)) >= token1Amount,"Not enough token are allowed to perform this action.");        
        require(tokenB.allowance(msg.sender,address(this)) >= token2Amount, "Not enough token are allowed to perform this action.");

        //console.log("Progress", "Gained Approval");
        
        require(tokenA.transferFrom(msg.sender,address(this),token1Amount),"Transaction failed.");
        require(tokenB.transferFrom(msg.sender,address(this),token2Amount),"Transaction failed.");
        //console.log("Progress", "Token Transfer completed");

        MintableToken poolToken = new MintableToken("LPT","POOL",8);        
        
        uint tokenReceived = calculateLPToken(true,token1Amount,token2Amount,0,0,poolToken.totalSupply()); //By Default Pool is empty
        liquidityPool[poolAddress] = Pool(address(poolToken),token1,token2,token1Amount,token2Amount,true);        
        require(poolToken.mint(msg.sender,tokenReceived),"Transaction failed.");
        
        //console.log("Progress", "Liquidity Pool created.");
        return (poolAddress,address(poolToken));
    }

    function convertLPTokenToToken(uint lpAmount, uint totalSupply, uint tokenReserve)public pure returns(uint){
        return tokenReserve * lpAmount / totalSupply;
    }

    function withdrawFund(address pool, uint amount)public payable returns(uint,uint){   
        ERC20Interface poolToken = ERC20Interface(liquidityPool[pool].poolToken);
        require(poolToken.balanceOf(msg.sender) >= amount,"Not enough amount");
    
        uint token1Received = convertLPTokenToToken(amount,poolToken.totalSupply(),liquidityPool[pool].token1Balance);
        uint token2Received = convertLPTokenToToken(amount,poolToken.totalSupply(),liquidityPool[pool].token2Balance);        

        liquidityPool[pool].token1Balance -= token1Received;
        liquidityPool[pool].token2Balance -= token2Received;  

        ERC20Interface tokenA = ERC20Interface(liquidityPool[pool].token1);
        ERC20Interface tokenB = ERC20Interface(liquidityPool[pool].token2);

        require(tokenA.transfer(msg.sender,token1Received),"Transaction failed.");
        require(tokenB.transfer(msg.sender,token2Received),"Transaction failed.");

        require(poolToken.burn(msg.sender,amount));                
        return (token1Received,token2Received);       
    }

    function isPoolExist(address _address) private view returns(bool){
        Pool memory pool = liquidityPool[_address];
        return pool.isAdded || (pool.token1Balance == 0 && pool.token2Balance == 0);        
    }

    //PURE FUNCTION
    //Retrieve amount of y 
    function computePrice(uint256 x, uint256 y, uint256 amount) public pure returns(uint256){
        if(x == 0 && y == 0){   
            return amount;
        }
        else{
            return amount * x / y;     
        }        
    }

    function generatePoolId(address tokenA, address tokenB) public pure returns (address){
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);        
        return address(uint160(uint256(keccak256(abi.encodePacked(token0, token1)))));  
    }

    
    function calculateInterest(uint tokenAmount,uint poolAmount,uint accumulatedInterest)public pure returns(uint){
        return tokenAmount * accumulatedInterest / poolAmount;        
    }

    function calculateLPToken(bool isInitiator, uint token1Amount, uint token2Amount, uint token1Reserve, uint token2Reserve, uint totalSupply)public pure returns(uint){
        if(!isInitiator){
            uint resultA = token1Amount * totalSupply / token1Reserve;
            uint resultB = token2Amount * totalSupply / token2Reserve;
            return resultA > resultB ? resultB : resultA;
        }
        else{
            return sqrt(token1Amount * token2Amount);
        }
    }

    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    modifier onlyOwner(address sender){
        require(sender == owner,"Only owner able to execute this action.");
        _;
    }

    function swap(address fromToken, address toToken, uint256 tokenX) public payable{
        //Step 1: Select pool
        address poolID = generatePoolId(fromToken, toToken);
        require(liquidityPool[poolID].isAdded,"Liquidity Pool not found.");

        //Step 2: Calculate K (here got no K value, we calculate manually)
        uint k = liquidityPool[poolID].token1Balance * liquidityPool[poolID].token2Balance;

        //Step 3: SWAP_X_to_Y        
        ERC20Interface tokenFrom = ERC20Interface(fromToken);
        ERC20Interface tokenTo = ERC20Interface(toToken);

        require(tokenX <= tokenFrom.allowance(msg.sender,address(this)),"Not enough token");

        //Step 3.1: Calculate different between y-(k/x)
        uint difference = liquidityPool[poolID].token2Balance - (k/(liquidityPool[poolID].token1Balance+tokenX));
                
        //Step 3.2: Transfer the amount of difference from pool to user account
        require(tokenTo.transfer(msg.sender, difference),"Transaction failed."); //transfer

        //Step 3.3: Transfer amount of TokenX (fromToken) from user account to pool
        require(tokenFrom.transferFrom(msg.sender, address(this), tokenX),"Transaction failed"); //transferfrom
            
	    //Step 3.4: update pool's token value
        liquidityPool[poolID].token1Balance += tokenX; //plus because we add in the tokenX into Pool
        liquidityPool[poolID].token2Balance -= difference; //minus because we already take the tokenY        
    }

    function estSwap(address fromToken,address toToken, uint256 tokenX)public view returns(uint){
        address poolID = generatePoolId(fromToken, toToken);
        require(liquidityPool[poolID].isAdded,"Liquidity Pool not found.");
        
        uint k = liquidityPool[poolID].token1Balance * liquidityPool[poolID].token2Balance;
                
        uint difference = liquidityPool[poolID].token2Balance - (k/(liquidityPool[poolID].token1Balance+tokenX));
        return difference;
    }
}
