// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "abdk-libraries-solidity/ABDKMath64x64.sol";
import "./Math.sol";
import "./interfaces/IXenToken.sol";
import "./interfaces/IERC20.sol";

interface IXENCrypto {
    function getFeeDetails() external view returns (uint256, address);
}

contract FairCryptoAutomation {
    using Math for uint256;
    using ABDKMath64x64 for int128;
    using ABDKMath64x64 for uint256;
    // address of the XENCrypto token
    address xenToken;

    mapping(address => uint256) public dailyBudgets;
    mapping(address => address) public holderAddresses;
    uint256 public mintingFee;

    event Minted(address to);

    constructor(address _token) {
        xenToken = _token;
    }

    //check gas fees are below the specified variable for minting.
    function checkGasFee(
        address _account,
        uint256 gas_price,
        uint256 gas_units
    ) private pure returns (bool) {
        return _account.balance > gas_price.mul(gas_units);
    }

    //set the daily budget again.
    function depositFee() external payable {
        require(msg.value > 0);
        dailyBudgets[address] += msg.value;
    }

    //fund eth to minting account
    function _fund(address _mintAccount) private {
        require(dailyBudget[holderAddress] > mintingFee);
        address holderAddresse = holderAddresses[_mintAddress];
        payable(_mintAccount).transfer(mintingFee);
        depositFee[holderAddresse] -= mintingFee;
    }

    //mint xenToken
    function mintXenToken() external {
        uint256 maxTerm;
        maxTerm = msg.sender.delegatecall(
            abi.encodeWithSelector(
                IXenToken(xenToken).getCurrentMaxTerm.selector
            )
        );
        msg.sender.delegatecall(
            abi.encodeWithSelector(
                IXenToken(xenToken).claimRank.selector,
                maxTerm
            )
        );
    }

    //send remaining eths to the holder Address(funding Center) for the next account.
    //To reduce the amount of consuming eths on the transfer, Remaining eths will go to this contract directly
    //, not to real holder Address.
    function removeRemainingEth(address _mintAccount) payable {
        this.depositFee[holderAddresses[_mintAccount]] += msg.value;
    }
}
