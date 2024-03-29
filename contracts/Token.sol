//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

//Safe Math Interface
 
contract SafeMath {
 
    function safeAdd(uint a, uint b) public pure returns (uint c) {
        c = a + b;
        require(c >= a);
    }
 
    function safeSub(uint a, uint b) public pure returns (uint c) {
        require(b <= a);
        c = a - b;
    }
 
    function safeMul(uint a, uint b) public pure returns (uint c) {
        c = a * b;
        require(a == 0 || c / a == b);
    }
 
    function safeDiv(uint a, uint b) public pure returns (uint c) {
        require(b > 0);
        c = a / b;
    }
}
 
 
//ERC Token Standard #20 Interface
//From https://docs.openzeppelin.com/contracts/2.x/api/token/erc20
//From https://www.quicknode.com/guides/solidity/how-to-create-and-deploy-an-erc20-token
interface ERC20Interface {
    function totalSupply() external view returns (uint);    
    function balanceOf(address tokenOwner) external view returns (uint balance);
    function allowance(address tokenOwner, address spender) external view returns (uint remaining);
    function transfer(address to, uint tokens) external returns (bool success);
    function approve(address spender, uint tokens) external returns (bool success);
    function transferFrom(address from, address to, uint tokens) external returns (bool success);
    function symbol() external view returns(string memory);
    function name() external view returns(string memory);
    function decimals() external view returns (uint8);
    function burn(address account, uint amount) external returns(bool success);
    function mint(address to, uint amount) external returns(bool success);

    event Transfer(address indexed from, address indexed to, uint tokens);
    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}

contract Token is ERC20Interface, SafeMath {
    string public symbol;
    string public  name;
    uint8 public decimals;
    uint public _totalSupply;
 
    address public deployer;

    mapping(address => uint) balances;
    mapping(address => mapping(address => uint)) allowed;
    
    constructor(string memory _symbol, string memory _name, uint8 _decimal, uint _total) {
        symbol = _symbol;
        name = _name;
        decimals = _decimal;
        _totalSupply = _total;
        deployer = msg.sender;        
        balances[deployer] = _totalSupply;
        emit Transfer(address(0), deployer, _totalSupply);
    }
 
    function totalSupply() public view override returns (uint) {
        return _totalSupply; 
    }
 
    function balanceOf(address tokenOwner) public view override returns (uint) {
        return balances[tokenOwner];
    }
 
    function transfer(address to, uint tokens) public override returns (bool) {
        balances[msg.sender] = safeSub(balances[msg.sender], tokens);        
        balances[to] = safeAdd(balances[to], tokens);
        emit Transfer(msg.sender, to, tokens);
        return true;
    }
 
    function approve(address spender, uint tokens) public override returns (bool) {
        allowed[msg.sender][spender] = tokens;
        emit Approval(msg.sender, spender, tokens);
        return true;
    }
 
    function transferFrom(address from, address to, uint tokens) public override returns (bool) {
        balances[from] = safeSub(balances[from], tokens);
        allowed[from][msg.sender] = safeSub(allowed[from][msg.sender], tokens);
        balances[to] = safeAdd(balances[to], tokens);
        emit Transfer(from, to, tokens);
        return true;
    }
 
    function allowance(address tokenOwner, address spender) public view override returns (uint) {
        return allowed[tokenOwner][spender];
    }

    //Reference: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/ERC20.sol
    function burn(address account, uint amount)public override isOwner(msg.sender) returns(bool){
        require(account != address(0), "ERC20: burn from the zero address");
        
        uint256 accountBalance = balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        balances[account] = safeSub(accountBalance, amount);
        _totalSupply = safeSub(_totalSupply,amount);

        emit Transfer(account, address(0), amount);
        return true;
    }

    function mint(address, uint)public override virtual isOwner(msg.sender) returns(bool){
        require(false,"This token is not mintable.");
        return false;
    }

    modifier isOwner(address account){
        require(deployer == account);
        _;
    }
}

contract MintableToken is Token{
    constructor(string memory _symbol, string memory _name, uint8 _decimal) Token(_symbol,_name,_decimal,0){        
    }   

    function mint(address to, uint amount)public override isOwner(msg.sender) returns(bool){
        _totalSupply += amount;        
        balances[to] = safeAdd(balances[to], amount);
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}