//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import "./token.sol";

//From <https://docs.uniswap.org/protocol/V2/concepts/core-concepts/pools>
//From <https://medium.com/@austin_48503/%EF%B8%8F-minimum-viable-exchange-d84f30bd0c90>
//From <https://docs.privacyswap.finance/guides/calculating-how-many-tokens-your-lps-are-worth>
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

    constructor(){                                                                          
        owner = msg.sender;
    }

    function checkBalances(address token)public view returns(uint){
        return ERC20Interface(token).balanceOf(msg.sender);
    }

    function isPoolExist(address tokenA, address tokenB)public view returns(bool,address){
        address poolId = generatePoolId(tokenA,tokenB);
        return (isPoolExist(poolId),poolId);
    }
    

    function fundLiquidityPool(address payable token1, address payable token2, uint token1Amount) public payable{
        address poolAddress = generatePoolId(token1,token2);
        require(isPoolExist(poolAddress),"Pool is not exist, please create a new pool.");        
        require(token1Amount > 0, "Amount to fund must greater than 0.");
        
        ERC20Interface poolToken = ERC20Interface(liquidityPool[poolAddress].poolToken);

        uint tokenReceived;
        uint token2Amount;
        ERC20Interface tokenA = ERC20Interface(token1);
        ERC20Interface tokenB = ERC20Interface(token2);

        if(token1 == liquidityPool[poolAddress].token1){
            uint tokenABalance = liquidityPool[poolAddress].token1Balance;
            uint tokenBBalance = liquidityPool[poolAddress].token2Balance;

            token2Amount = computePrice(tokenABalance,tokenBBalance,token1Amount); 
            tokenReceived = calculateLPToken(false,token1Amount,token2Amount,tokenABalance,tokenBBalance,poolToken.totalSupply());

            liquidityPool[poolAddress].token1Balance += token1Amount;            
            liquidityPool[poolAddress].token2Balance += token2Amount;   
        }
        else{
            uint tokenABalance = liquidityPool[poolAddress].token2Balance;
            uint tokenBBalance = liquidityPool[poolAddress].token1Balance;            

            token2Amount = computePrice(tokenABalance,tokenBBalance,token1Amount);
            tokenReceived = calculateLPToken(false,token1Amount,token2Amount,tokenABalance,tokenBBalance,poolToken.totalSupply());
        
            liquidityPool[poolAddress].token2Balance += token1Amount;            
            liquidityPool[poolAddress].token1Balance += token2Amount;
        } 

        tokenA.transferFrom(msg.sender, address(this),token1Amount);
        tokenB.transferFrom(msg.sender, address(this),token2Amount);  

        //Add liquidity                                            
        require(poolToken.mint(msg.sender,tokenReceived),"Transaction failed.");
    }

    function addLiquidityPool(address payable token1, address payable token2, uint token1Amount, uint token2Amount) public payable{
        address poolAddress = generatePoolId(token1,token2);
        require(!isPoolExist(poolAddress),"Pool already exist.");        
        //need to call approve first
        ERC20Interface tokenA = ERC20Interface(token1);
        ERC20Interface tokenB = ERC20Interface(token2);

        require(tokenA.allowance(msg.sender, address(this)) >= token1Amount,"Not enough token are allowed to perform this action.");        
        require(tokenB.allowance(msg.sender,address(this)) >= token2Amount, "Not enough token are allowed to perform this action.");

        //console.log("Progress", "Gained Approval");
        
        require(tokenA.transferFrom(msg.sender,address(this),token1Amount),"Transaction failed.");
        require(tokenB.transferFrom(msg.sender,address(this),token2Amount),"Transaction failed.");
        //console.log("Progress", "Token Transfer completed");

        MintableToken poolToken = new MintableToken("LPT",concat(tokenA.symbol(),"-",tokenB.symbol()),8);        
        
        uint tokenReceived = calculateLPToken(true,token1Amount,token2Amount,0,0,poolToken.totalSupply()); //By Default Pool is empty
        liquidityPool[poolAddress] = Pool(address(poolToken),token1,token2,token1Amount,token2Amount,true);        
        require(poolToken.mint(msg.sender,tokenReceived),"Transaction failed.");
        
    }

    function convertLPTokenToToken(uint lpAmount, uint totalSupply, uint tokenReserve)public pure returns(uint){
        return tokenReserve * lpAmount / totalSupply;
    }

    function withdrawFund(address pool, uint amount)public payable{ 
        require(isPoolExist(pool),"Pool is not exist.");
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
    }

    function isPoolExist(address _address) private view returns(bool){        
        return liquidityPool[_address].isAdded;        
    }

    //PURE FUNCTION
    //Retrieve amount of y 
    function computePrice(uint256 x, uint256 y, uint256 amount) public pure returns(uint256){
        return (x == 0 && y == 0 ) ? amount : amount * y / x;     
    }

    function generatePoolId(address tokenA, address tokenB) public pure returns (address){
        require(tokenA != tokenB,"Invalid Pair of Token");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);        
        return address(uint160(uint256(keccak256(abi.encodePacked(token0, token1)))));  
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

    function sqrt(uint x) internal pure returns (uint y) {
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    modifier onlyOwner(address sender){
        require(sender == owner,"Only owner able to execute this action.");
        _;
    }

    function swap(address fromToken, address toToken, uint256 tokenX) public payable{
        address poolID = generatePoolId(fromToken, toToken);
        require(isPoolExist(poolID),"Pool is not exist.");

        //Step 2: Calculate K (here got no K value, we calculate manually)
        uint k = liquidityPool[poolID].token1Balance * liquidityPool[poolID].token2Balance;

        //Step 3: SWAP_X_to_Y        
        ERC20Interface tokenFrom = ERC20Interface(fromToken);
        ERC20Interface tokenTo = ERC20Interface(toToken);

        require(tokenX <= tokenFrom.allowance(msg.sender,address(this)),"Not enough token");

        //Step 3.1: Calculate different between y-(k/x)
        uint balanceFrom;
        uint balanceTo; 
        if(liquidityPool[poolID].token1 == fromToken){
            balanceFrom = liquidityPool[poolID].token1Balance;
            balanceTo = liquidityPool[poolID].token2Balance;
        }
        else{
            balanceFrom = liquidityPool[poolID].token2Balance;
            balanceTo = liquidityPool[poolID].token1Balance;
        }        
        uint difference = balanceTo - (k/(balanceFrom+tokenX));
                
        //Step 3.2: Transfer the amount of difference from pool to user account
        require(tokenTo.transfer(msg.sender, difference),"Transaction failed."); //transfer

        //Step 3.3: Transfer amount of TokenX (fromToken) from user account to pool
        require(tokenFrom.transferFrom(msg.sender, address(this), tokenX),"Transaction failed"); //transferfrom
            
	    //Step 3.4: update pool's token value
        if(liquidityPool[poolID].token1 == fromToken){
            liquidityPool[poolID].token1Balance += tokenX; //plus because we add in the tokenX into Pool
            liquidityPool[poolID].token2Balance -= difference; //minus because we already take the tokenY       
        }        
        else{
            liquidityPool[poolID].token2Balance += tokenX;
            liquidityPool[poolID].token1Balance -= difference;     
        }         
    }

    function estSwap(address fromToken,address toToken, uint256 tokenX)public view returns(uint){
        address poolID = generatePoolId(fromToken, toToken);
        require(isPoolExist(poolID),"Liquidity Pool not found.");
        

        uint k = liquidityPool[poolID].token1Balance * liquidityPool[poolID].token2Balance;

        uint balanceFrom;
        uint balanceTo; 
        if(liquidityPool[poolID].token1 == fromToken){
            balanceFrom = liquidityPool[poolID].token1Balance;
            balanceTo = liquidityPool[poolID].token2Balance;
        }
        else{
            balanceFrom = liquidityPool[poolID].token2Balance;
            balanceTo = liquidityPool[poolID].token1Balance;
        }

        return (balanceTo - (k/(balanceFrom+tokenX)));        
    }

    function estFundPool(address tokenA, address tokenB, uint amount)public view returns(uint amount2, uint share){
        address poolAddress = generatePoolId(tokenA,tokenB);
        require(isPoolExist(poolAddress),"Pool is not exist.");        

        uint tokenABalance;
        uint tokenBBalance;        
        if(tokenA == liquidityPool[poolAddress].token1){
            tokenABalance = liquidityPool[poolAddress].token1Balance;
            tokenBBalance = liquidityPool[poolAddress].token2Balance;         
        }
        else{
            tokenABalance = liquidityPool[poolAddress].token2Balance;
            tokenBBalance = liquidityPool[poolAddress].token1Balance;            
        }        
        uint token2Amount = computePrice(tokenABalance,tokenBBalance,amount);  
        return (token2Amount,(amount * 10000) / (tokenABalance + amount));
        //Return Amount Need To import for B, share in percentage (0 stands for < 0.01%)
    }

    function estWithdrawFund(address pool, uint amount)public view returns(uint amount1,uint amount2,address token1,address token2){
        require(isPoolExist(pool),"Pool is not exist.");
        
        ERC20Interface poolToken = ERC20Interface(liquidityPool[pool].poolToken);
    
        uint token1Received = convertLPTokenToToken(amount,poolToken.totalSupply(),liquidityPool[pool].token1Balance);
        uint token2Received = convertLPTokenToToken(amount,poolToken.totalSupply(),liquidityPool[pool].token2Balance);        
              
        return (token1Received,token2Received,liquidityPool[pool].token1,liquidityPool[pool].token2);
    }

    function concat(string memory a, string memory b, string memory c)private pure returns(string memory){
        return string(abi.encodePacked(a, b,c));
    }    
}
