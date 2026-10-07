// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
interface IERC20{function transferFrom(address,address,uint256)external returns(bool);function transfer(address,uint256)external returns(bool);}
contract StellarNetTelcom{
 address public immutable owner; IERC20 public immutable usdc; address public aiConsensusOracle; bool public paused;
 uint256 public constant STARTUP_COST=8e6; uint256 public constant MONTHLY_COST=4e6; uint256 public constant DATA_OVERUSE_MULTIPLIER=104;
 struct Subscriber{bool active;uint64 nextPaymentDue;uint256 overage;} mapping(address=>Subscriber) public subscribers;
 event Activated(address indexed user,uint256 paid,string workspaceId); event Renewed(address indexed user,uint256 paid,uint256 nextDue); event OverageRecorded(address indexed user,uint256 providerCost,uint256 adjustedFee);
 modifier onlyOwner(){require(msg.sender==owner,"not owner");_;} modifier onlyOracle(){require(msg.sender==aiConsensusOracle,"not oracle");_;} modifier live(){require(!paused,"paused");_;}
 constructor(address _usdc,address _oracle){require(_usdc!=address(0),"usdc");owner=msg.sender;usdc=IERC20(_usdc);aiConsensusOracle=_oracle;}
 function setOracle(address x)external onlyOwner{aiConsensusOracle=x;} function setPaused(bool x)external onlyOwner{paused=x;}
 function activateESim(string calldata workspaceId)external live{require(!subscribers[msg.sender].active,"active");require(usdc.transferFrom(msg.sender,address(this),STARTUP_COST),"transfer");subscribers[msg.sender]=Subscriber(true,uint64(block.timestamp+30 days),0);emit Activated(msg.sender,STARTUP_COST,workspaceId);}
 function renew()external live{Subscriber storage s=subscribers[msg.sender];require(s.active,"inactive");require(block.timestamp>=s.nextPaymentDue,"not due");uint256 due=MONTHLY_COST+s.overage;s.overage=0;s.nextPaymentDue=uint64(block.timestamp+30 days);require(usdc.transferFrom(msg.sender,address(this),due),"transfer");emit Renewed(msg.sender,due,s.nextPaymentDue);}
 function recordOverage(address u,uint256 providerCost)external onlyOracle{Subscriber storage s=subscribers[u];require(s.active,"inactive");uint256 fee=providerCost*DATA_OVERUSE_MULTIPLIER/100;s.overage+=fee;emit OverageRecorded(u,providerCost,fee);}
 function deactivate()external{subscribers[msg.sender].active=false;} function withdraw(address to,uint256 amount)external onlyOwner{require(usdc.transfer(to,amount),"withdraw");}
}