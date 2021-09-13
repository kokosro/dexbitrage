// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface IERC20 {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function allowance(address owner, address spender) external view returns (uint);
    function approve(address spender, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);
    function deposit() external payable;
    function withdraw(uint) external;
}

interface IRouter {
    function factory() external pure returns (address);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);
}

contract Dexbitrage {
  using SafeMath for uint256;
  address private _owner;
  IERC20 WETH = IERC20(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c);
  constructor() {
    _owner = msg.sender;
  }
  function owner() public view returns (address){
    return _owner;
  }
  modifier onlyOwner() {
    require(owner() == msg.sender, "DB: OO");
    _;
  }
  function transferOwnership(address _newOwner) public onlyOwner{
    require(_newOwner != address(0),"DB: IO");
    _owner = _newOwner;
  }
  function changeWETH(IERC20 address_) public onlyOwner{
    WETH = address_;
  }
  function loadETH() public payable {
    WETH.deposit{value: msg.value}();
  }
  function balance(address token) public view returns(uint256) {
    if(address(0) == token){
      return address(this).balance;
    }
    return IERC20(token).balanceOf(address(this));
  }
  function offload(address token, uint256 amount) public onlyOwner{
    if(address(0) == token){
      require(balance(address(0)) > 0 && amount <= balance(address(0)), "DB: WIAE");
      if(amount == 0){
        payable(msg.sender).transfer(balance(address(0)));
      }else{
        payable(msg.sender).transfer(amount);
      }
    }else{
      require(balance(token) > 0 && amount <= balance(token), "DB: WIAT");
      if(amount == 0){
        IERC20(token).transfer(msg.sender, balance(token));
      }else{
        IERC20(token).transfer(msg.sender, amount);
      }
    }
  }
  
  function bitrage(uint256 startAmount, address[] calldata routers, address[] calldata path) public onlyOwner returns(uint256){
    require(path.length == routers.length+1, "DB: IRP");
    require(path[0] == path[path.length-1],"DB: IP");
    
    if(startAmount == 0){
      startAmount = balance(path[0]);
    }
    require(startAmount > 0, "DB: ISA");
    uint256 startBalance = balance(path[0]);
    address startToken = path[0];
    address currentToken = path[0];
    uint256 pathIndex = 0;
    uint256 iamount = startAmount;
    for(uint256 i = 0; i < routers.length; i++){
      address[] memory usePath = new address[](2);
      usePath[0] = path[i];
      usePath[1] = path[i+1];
      uint256[] memory expecteds = IRouter(routers[i]).getAmountsOut(iamount, usePath);
      uint256 minExpected = expecteds[1].sub(1);
      IERC20(path[i]).approve(routers[i], iamount);
      uint256[] memory resulted = IRouter(routers[i]).swapExactTokensForTokens(iamount,
                                                                               minExpected,
                                                                               usePath,
                                                                               address(this),
                                                                               block.timestamp + 300
                                                                               );
      iamount = resulted[1];
      require(iamount > 0, "DB: BF");
    }
    require(iamount > startAmount, "DB: NB1");
    require(startBalance < balance(startToken), "DB: NB2");
    return iamount.sub(startAmount);
  }
  
}
