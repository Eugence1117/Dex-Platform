//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

//Only Used in Remix
//import "hardhat/console.sol";

interface ERC20Interface {
    function totalSupply() external view returns (uint);
    function balanceOf(address tokenOwner) external view returns (uint balance);
    function allowance(address tokenOwner, address spender) external view returns (uint remaining);
    function transfer(address to, uint tokens) external returns (bool success);
    function approve(address spender, uint tokens) external returns (bool success);
    function transferFrom(address from, address to, uint tokens) external returns (bool success);
 
    event Transfer(address indexed from, address indexed to, uint tokens);
    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}

contract dex{
    struct Pool{
        address token1;
        address token2;
        uint256 token1Balance;
        uint256 token2Balance;
        uint token1Interest; //PENDING FOR BETTER SOLUTION
        uint token2Interest;        
        bool isAdded;
    }

    //pool address => token address => wallet => balances
    mapping(address => mapping(address => mapping(address => uint))) liquidity;

    mapping(address => ERC20Interface) public tokens;
    mapping(address => Pool) public liquidityPool;
    address private owner;

    //Token public poolToken;
    event Response(address sender, string message, address contractAddress);

    constructor(){                                                                          
        owner = msg.sender;
    }
    
    function importToken(address tokenAddress)public {
        tokens[tokenAddress] = ERC20Interface(tokenAddress);
    }

    // function addToken(string memory symbol, string memory name)public payable onlyOwner(msg.sender) returns(address){
    //      Token token = new Token(symbol,name,2,100000);
    //      tokens[address(token)] = token;
    //      emit Response(msg.sender,"New Token added",address(token));
    //      return address(token);
    // }

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

    function mintToken(address to, address token, uint amount)public payable{
        require(amount <= tokens[token].totalSupply(),"Not enough supply.");
        tokens[token].transfer(to,amount);
    }

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

    function addLiquidityPool(address payable token1, address payable token2, uint token1Amount, uint token2Amount) public payable returns(address){
        require(token1 != token2,"Invalid liquidity pool.");
        address poolAddress = generatePoolId(token1,token2);

        //need to call approve first
        require(tokens[token1].allowance(msg.sender, address(this)) >= token1Amount,"Not enough token are allowed to perform this action.");        
        require(tokens[token2].allowance(msg.sender,address(this)) >= token2Amount, "Not enough token are allowed to perform this action.");

        console.log("Progress", "Gained Approval");
        // require(tokens[token1].approve(address(this),token1Amount),"Transaction rejected.");
        // require(tokens[token2].approve(address(this),token2Amount),"Transaction rejected.");
        require(tokens[token1].transferFrom(msg.sender,address(this),token1Amount),"Transaction failed.");
        require(tokens[token2].transferFrom(msg.sender,address(this),token2Amount),"Transaction failed.");
        console.log("Progress", "Token Transfer completed");
        liquidityPool[poolAddress] = Pool(token1,token2,token1Amount,token2Amount,0,0,true);
        liquidity[poolAddress][token1][msg.sender] += token1Amount;
        liquidity[poolAddress][token2][msg.sender] += token2Amount;
        console.log("Progress", "Liquidity Pool created.");
        return poolAddress;
    }

    function transferTest(uint amount, address token)public payable{
        require(tokens[token].transferFrom(msg.sender,address(this),amount));
    }


    function withdrawFund(address pool, uint amount)public payable{   
            
        uint token1Balance = liquidityPool[pool].token1Balance;
        uint token2Balance = liquidityPool[pool].token2Balance;

        uint token1Fund = liquidity[pool][liquidityPool[pool].token1][msg.sender] * amount / 100;
        uint token2Fund = liquidity[pool][liquidityPool[pool].token2][msg.sender] * amount / 100;

        uint token1Received = calculateInterest(token1Fund,token1Balance,liquidityPool[pool].token1Interest) + token1Fund;
        uint token2Received = calculateInterest(token2Fund,token2Balance,liquidityPool[pool].token2Interest) + token2Fund;

        require(tokens[liquidityPool[pool].token1].transfer(msg.sender,token1Received),"Withdraw Fund unsuccess.");
        require(tokens[liquidityPool[pool].token2].transfer(msg.sender,token2Received),"Withdraw Fund unsuccess.");

        liquidity[pool][liquidityPool[pool].token1][msg.sender] -= token1Fund;
        liquidity[pool][liquidityPool[pool].token2][msg.sender] -= token2Fund;

        liquidityPool[pool].token1Balance -= token1Fund;
        liquidityPool[pool].token2Balance -= token2Fund;        
        //amount in percentage        
    }
    
    function computePrice(uint256 x, uint256 y, uint256 amount) public pure returns(uint256){
        return y - ((x * y) / (x + amount)); //XYKModel
    }

    function isPoolExist(address _address) private view returns(bool){
        Pool memory pool = liquidityPool[_address];
        return pool.isAdded || (pool.token1Balance == 0 && pool.token2Balance == 0);        
    }

    function generatePoolId(address tokenA, address tokenB) public pure returns (address){
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);        
        return address(uint160(uint256(keccak256(abi.encodePacked(token0, token1)))));  
    }

    function getAllToken() public view{
        //PENDING return in JSON FORM 
    }

    modifier onlyOwner(address sender){
        require(sender == owner,"Only owner able to execute this action.");
        _;
    }
	
	//qinghao xyk model part
    function SWAP_X_to_Y(address fromToken, address toToken, uint256 tokenX) public payable{
        //Step 1: Select pool
        address poolID = generatePoolId(fromToken, toToken);

        //Step 2: Calculate K (here got no K value, we calculate manually)
        uint k = liquidityPool[poolID].token1Balance * liquidityPool[poolID].token2Balance;

        //Step 3: SWAP_X_to_Y
        //Step 3.1: Transfer amount of TokenX (fromToken) from user account to pool
        require(tokenX <= tokens[fromToken].allowance(msg.sender,address(this)),"Not enough token");
        tokens[fromToken].transferFrom(msg.sender, address(this), tokenX); //transferfrom

        //Step 3.2: Calculate different between y-(k/x)
        uint difference = liquidityPool[poolID].token2Balance - (k/liquidityPool[poolID].token1Balance);

        //Step 3.3: Transfer the amount of difference from pool to user account
        tokens[toToken].transfer(msg.sender, difference); //transfer

	    //Step 3.4: update pool's token value
        liquidityPool[poolID].token1Balance += tokenX; //plus because we add in the tokenX into Pool
        liquidityPool[poolID].token2Balance -= difference; //minus because we already take the tokenY
        
    }
}