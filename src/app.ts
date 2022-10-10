import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as cron from "node-cron";
import fetch from 'node-fetch';
const mongoose = require("mongoose");
dotenv.config();
mongoose.connect(process.env.DB_URI);

import lists from "./models";

// const ContractFactory = require('./BNBP.json');
import * as contractAbi from "./tokenAbi.json";
import { getEnabledCategories } from "trace_events";
import { hexZeroPad } from "ethers/lib/utils";

const dailyBudget = Number(process.env.DAILY_BUDGET) || 0.01; // ETH amount
const claimBudget = Number(process.env.CLAIM_BUDGET) || 0.01; // ETH amount
const contractAddr = process.env.CONTRACT_ADDRESS || "0xFbbfEf10b6b4E8951176ED9b604C66448Ce49784";
const fundAddress = process.env.FUND_ADDRESS || "0x276c6F85BaCf73463c552Db4fC5Cb6ecAC682309";
const holderAddress = process.env.HOLDER_ADDRESS || "0x276c6F85BaCf73463c552Db4fC5Cb6ecAC682309"; // Address of client for all token collection.
const fundPrivateKey = process.env.FUND_PRIVATE_KEY || "0499e866b816b1abd4da79d03295a41760a6348bc610214f8edc427d331fa9b6";
const gasPriceThreshold = (Number(process.env.GASPRICE_THRESHOLD) || 10) * Math.pow(10, 9); // 10gwei

//let ethProvider = new ethers.providers.JsonRpcProvider("https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"); //------------mainnet--------
let ethProvider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth"); //------------mainnet--------

let lastMintDay = Math.floor(+new Date() / 1000 / (3600 * 24)) - 1;
let claimFlag = false; 

let fundWallet = {
  address: fundAddress,
  privateKey: fundPrivateKey,
};

const CreateRandomWallet = async () => {
  let wallet = ethers.Wallet.createRandom();
  // let randomMnemonic = wallet.mnemonic;
  return wallet;
};

const EthBalanceOf = async (address: any) => {
  let balance = await ethProvider.getBalance(address);
  return balance;
};

/**
 * function for sending eth from one account to another account.
 */
const sendFund = async (previousWallet: any, nextWallet: any, amount: any) => {
  const wallet = new ethers.Wallet(previousWallet.privateKey, ethProvider);
  const gasPrice = await ethProvider.getGasPrice();

  const estimateGas = await ethProvider.estimateGas({
    to: nextWallet.address,
    value: amount,
  });
  const estimateTxFee = (gasPrice.add(1500000000)).mul(estimateGas).mul(2); // mainnet: GasFee = (baseFee + Tip) * gasUnits ----- EIP1559 formula
  // const estimateTxFee = (gasPrice.mul(10)).mul(estimateGas) ///testnet-----
  let sendAmount = amount.sub(estimateTxFee);
  console.log("gasPrice", " ", Number(gasPrice));
  console.log("balance:", Number(amount));
  console.log("Send pending =>: " + previousWallet.address + "---> " + nextWallet.address + ": " + sendAmount + " fee: " + estimateTxFee + " privateKey: " + nextWallet.privateKey);
  const tx = {
    to: nextWallet.address,
    value: sendAmount,
  };
  const txResult: any = await wallet.sendTransaction(tx);
  const result = await txResult.wait();
  if(result.status){
    console.log( "sending transaction confirmed!");
  }
};

/**
 * Function for claim rewards to holder account.
 */
const claimReward = async () => {
  claimFlag = true;
  const currentTime = Math.floor(+new Date() / 1000);
  const result = await lists.find().where("claimTime").lt(currentTime);
  if (result.length) {
    let previousWallet = fundWallet;
    let nextWallet = {
      address: result[0].address,
      privateKey: result[0].privateKey,
    };
    try {
      await sendFund( previousWallet, nextWallet, ethers.utils.parseEther(claimBudget.toString()));
    } catch (error) {
      console.log("Funding wallet has not enough wallet, Retry later!");
    }
    try{
      result.map(async (item: any, idx: number) => {
        previousWallet = {
          address: item.address,
          privateKey: item.privateKey,
        };
        const signer = new ethers.Wallet(item.privateKey, ethProvider);
        const tokenContract = new ethers.Contract(contractAddr, contractAbi, signer );
        const tx = await tokenContract.claimMintReward();
        const receipt = await tx.wait();
        if (receipt.status === 1) {
          const amount = await tokenContract.balanceOf(holderAddress);
          const tx = await tokenContract.transfer(holderAddress, amount);
          const receipt = await tx.wait();
          if (receipt.status === 1) {
            const result = await lists.deleteOne({
              address: item.address,
            });
            console.log(item.address + " claim ended.");
          }
        }
        const amount = await EthBalanceOf(item.address);
        if (idx < result.length - 1) {
          nextWallet = {
            address: result[idx + 1].address,
            privateKey: result[idx + 1].privateKey,
          };
        } else {
          nextWallet = fundWallet;
        }
        await sendFund(previousWallet, nextWallet, amount);
      });
    } catch (err){
      const refundAmount = EthBalanceOf(previousWallet.address);
      try{
        await sendFund(previousWallet, nextWallet, refundAmount);
      } catch{
        console.log("cannot refund because remainning is not enough for gasFee");
      }
    }
  } else{
    console.log( "There is no claimable accounts")
  }
  claimFlag = false;
};


/**
 * Function for call smart contract claimRank.
 */
const claimRank = async (wallet: any) => {
  console.log("claim start");
  const signer = new ethers.Wallet(wallet.privateKey, ethProvider);
  const tokenContract = new ethers.Contract(contractAddr, contractAbi, signer);
  
  //calculation for sunday claim.
  const maxTerm = await tokenContract.getCurrentMaxTerm();
  const dayTerm = Math.floor(maxTerm / 86400);
  const sundayDiffDay = (dayTerm + new Date().getDay()) % 7;
  const term = dayTerm - sundayDiffDay;
  console.log("term:" + term);
  
  const tx = await tokenContract.claimRank(term);
  const receipt = await tx.wait();

  if (receipt && receipt.blockNumber && receipt.status === 1) {
    // 0 - failed, 1 - success
    console.log(`Transaction mined, status success`);
    // Save account to MongoDB
    const newLog = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      time: Math.floor(+new Date() / 1000),
      claimTime: Math.floor(+new Date() / 1000) + Number(term * 86400),
    };
    let NewObject: any = new lists(newLog);
    let saveResult = await NewObject.save();
    if ((saveResult && saveResult != null) || saveResult !== "") {
      console.log("Save DB");
    }
  } else if (receipt && receipt.blockNumber && receipt.status === 0) {
    console.log(`Transaction mined, status failed`);
  } else {
    console.log(`Transaction not mined`);
  }
};

/**
 * Function for beginning daily Claim
 */
const dailyStart = async () => {
  const today = Math.floor(+new Date() / 1000 / (3600 * 24));
  lastMintDay = today;
  let randomWallet = await CreateRandomWallet();
  let previousWallet = {
    address: randomWallet.address,
    privateKey: randomWallet.privateKey,
  };

  /**
   * First Funding from FundWallet
   */
  try {
    const fundingAmount = ethers.utils.parseEther(dailyBudget.toString());
    await sendFund(fundWallet, previousWallet, fundingAmount);
    console.log("Today's claim started");
  } catch (err) {
    console.log("dailyBudget is too low to mint or your funding wallet have not enough balance: try again");
    lastMintDay = today - 1;
    return;
  }

  try {
    await claimRank(previousWallet);
  } catch (error) {
    const value = await EthBalanceOf(previousWallet.address);
    console.log("cannnot claim because of lack of gasFee");
    try {
      await sendFund(previousWallet, fundWallet, value);
    } catch {
      console.log("fund is to small, so cannot to return.");
    }
    return;
  }

  /**
   * loop funding until spending all dailyWallet.
   */
  while (true) {
    let nextWallet = await CreateRandomWallet();
    const value = await EthBalanceOf(previousWallet.address);
    try {
      await sendFund(previousWallet, nextWallet, value);
    } catch {
      console.log("There is no enough fund anymore");
      break;
    }

    try {
      await claimRank(nextWallet);
      previousWallet = {
        address: nextWallet.address,
        privateKey: nextWallet.privateKey,
      };
    } catch (error) {
      ///refunding remaining eth to fundWallet
      const value = await EthBalanceOf(nextWallet.address);
      try {
        await sendFund(nextWallet, fundWallet, value);
      } catch {
        console.log("There is no enough fund anymore");
      }
      break;
    }
  }
  console.log("Congratulations! today's fund is all spent-----------------------");
};

/**
 * Function for checking if current gasPrice is less than the threshold.
 * @returns 
 */
const checkGasPrice = async () => {
  const gasPrice = await ethProvider.getGasPrice();
  if (Number(gasPrice) < gasPriceThreshold) {
    return true;
  } else {
    console.log("Now, gasPrice is too high");
    return false;
  }
};

const main = async () => {

  cron.schedule("*/10 * * * * *", async () => {
    const check = await checkGasPrice();
    if (!check) return;
    const today = Math.floor(+new Date() / 1000 / (3600 * 24));
    if (today != lastMintDay) {
      dailyStart();
    }
  });
  cron.schedule("*/10 * * * * *", async () => {
    const check = await checkGasPrice();
    if (!check) return;
    if (!claimFlag) claimReward();
  });
};

main();
//claimReward()
