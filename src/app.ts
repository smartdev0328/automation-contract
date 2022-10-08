import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as cron from 'node-cron';
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/claim_lists');

import lists from './models';

// const ContractFactory = require('./BNBP.json');
import * as contractAbi from './tokenAbi.json'
dotenv.config();

const dailyBudget = 0.05;// ETH amount
const claimBudget = 0.01;// ETH amount
const contractAddr = '0xFbbfEf10b6b4E8951176ED9b604C66448Ce49784';
const fundAddress = '0x276c6F85BaCf73463c552Db4fC5Cb6ecAC682309';
const holderAddress = '0x276c6F85BaCf73463c552Db4fC5Cb6ecAC682309';// Address of client for all token collection.
const fundPrivateKey = '0499e866b816b1abd4da79d03295a41760a6348bc610214f8edc427d331fa9b6';
const network = 'goerli';
const gasPriceThreshold = 5 * Math.pow(10, 9); //4gwei

const customWsProvider = ethers.getDefaultProvider(network);//-------------testnet-----------
//const customWsProvider = ethers.getDefaultProvider();//------------mainnet--------


let lastMintDay = Math.floor(+new Date() / 1000 / (3600 * 24)) - 1;
let claimFlag = false;

let fundWallet = {
	address: fundAddress,
	privateKey: fundPrivateKey
};

const CreateRandomWallet = async () => {
	let wallet = ethers.Wallet.createRandom();
	// let randomMnemonic = wallet.mnemonic;
	return wallet;
}

const EthBalanceOf = async (address: any) => {
	let balance = await customWsProvider.getBalance(address);
	return balance;
}

const Fund = async (previousWallet: any, nextWallet: any, value: any) => {
	const wallet = new ethers.Wallet(previousWallet.privateKey, customWsProvider)
	console.log(value)
	const gasPrice = await customWsProvider.getGasPrice()
	const estimateGas = await customWsProvider.estimateGas({
		to: nextWallet.address,
		value: value
	})
	const estimateTxFee = (gasPrice.add(10)).mul(700000)
	let maxValue = value.sub(estimateTxFee);
	console.log("fund:" + previousWallet.address + "--->" + nextWallet.address + ":" + maxValue + "fee:" + estimateTxFee)
	// ethers.utils.parseEther(amountInEther)
	const tx = {
		to: nextWallet.address,
		value: maxValue
	}
	const txResult: any = await wallet.sendTransaction(tx)
	const result = await txResult.wait();
	console.log("fund status:" + result.status);
}

const claimReward = async () => {
	claimFlag = true;
	try {
		const currentTime = Math.floor(+new Date() / 1000);
		console.log(currentTime)
		const result = await lists.find().where('claimTime').gt(currentTime)
		console.log(result)
		console.log(typeof result[0].claimTime)
		if (result.length) {
			let previousWallet = fundWallet;
			let nextWallet = { address: result[0].address, privateKey: result[0].privateKey };
			await Fund(previousWallet, nextWallet, ethers.utils.parseEther(dailyBudget.toString()))
			result.map(async (item: any, idx: number) => {
				const signer = new ethers.Wallet(item.privateKey, customWsProvider);
				const tokenContract = new ethers.Contract(contractAddr, contractAbi, signer)
				const tx = await tokenContract.claimMintReward();
				const receipt = await tx.wait();
				if (receipt.status === 1) {
					const amount = await tokenContract.balanceOf(holderAddress);
					const tx = await tokenContract.transfer(holderAddress, amount)
					const receipt = await tx.wait();
					if (receipt.status === 1) {
						const result = await lists.deleteOne({
							address: item.address
						});
						console.log(item.address + " claim ended.")
					}
				}
				const value = await EthBalanceOf(item.address)
				if (idx < result.length) {
					nextWallet = {
						address: result[idx + 1].address,
						privateKey: result[idx + 1].privateKey,
					}
				}
				else {
					nextWallet = fundWallet;
				}
				previousWallet = {
					address: item.address,
					privateKey: item.privateKey,
				}
				await Fund(previousWallet, nextWallet, value)
			})
		}
	} catch (error) {
		console.log('claimReward error : ')
	}
	claimFlag = false;
};

const claimMint = async (wallet: any) => {
	console.log('start')
	console.log(await EthBalanceOf(wallet.address))
	const signer = new ethers.Wallet(wallet.privateKey, customWsProvider);

	const tokenContract = new ethers.Contract(contractAddr, contractAbi, signer)
	const maxTerm = await tokenContract.getCurrentMaxTerm();
	const dayTerm = Math.floor(maxTerm / 86400)
	const sundayDiffDay = (dayTerm + new Date().getDay()) % 7;
	const term = dayTerm - sundayDiffDay;
	console.log("term:" + term)
	const tx = await tokenContract.claimRank(term);
	const receipt = await tx.wait();

	if (receipt && receipt.blockNumber && receipt.status === 1) { // 0 - failed, 1 - success
		console.log(`Transaction mined, status success`);
		// Save account to MongoDB
		const newLog = {
			address: wallet.address,
			privateKey: wallet.privateKey,
			time: Math.floor(+new Date() / 1000),
			claimTime: Math.floor(+new Date() / 1000) + Number(term * 86400)
		}
		let NewObject: any = new lists(newLog);
		let saveResult = await NewObject.save();
		if (saveResult && saveResult != null || saveResult !== '') {
			console.log('Save DB')
		}

	} else if (receipt && receipt.blockNumber && receipt.status === 0) {
		console.log(`Transaction mined, status failed`);
	} else {
		console.log(`Transaction not mined`);
	}
}

const dailyStart = async () => {
	console.log('Hello. let`s go to auto-mint');
	const today = Math.floor(+new Date() / 1000 / (3600 * 24));
	lastMintDay = today;
	let randomWallet = await CreateRandomWallet();
	let previousWallet = {
		address: randomWallet.address,
		privateKey: randomWallet.privateKey
	}
	try {
		await Fund(fundWallet, previousWallet, ethers.utils.parseEther(dailyBudget.toString()))
		await claimMint(previousWallet);
	} catch (error) {
		const value = await EthBalanceOf(previousWallet.address)
		await Fund(previousWallet, fundWallet, value);
		console.log("dailyBudget is too low to mint");
		return;
	}
	for (; ;) {//infinite loop
		let nextWallet = await CreateRandomWallet()
		try {
			const value = await EthBalanceOf(previousWallet.address)
			await Fund(previousWallet, nextWallet, value)
			await claimMint(nextWallet);
			previousWallet = {
				address: nextWallet.address,
				privateKey: nextWallet.privateKey
			}
		} catch (error) {

			///refunding remaining eth to fundWallet 
			const value = await EthBalanceOf(nextWallet.address)
			await Fund(nextWallet, fundWallet, value);
			console.log("Congratulations! today's fund is all spent-----------------------");
			break;
		}
	}
};


const checkGasPrice = async () => {

	const gasPrice = await customWsProvider.getGasPrice()
	//console.log(Number(gasPrice))
	//console.log(gasPriceThreshold)
	if (Number(gasPrice) < gasPriceThreshold) {
		return true;
	}
	else {
		console.log("Now, gasPrice is too high");
		return false;
	}
}
const main = async () => {
	cron.schedule("*/5 * * * * *", async () => {
		const check = await checkGasPrice()
		if (!check) return;
		const today = Math.floor(+new Date() / 1000 / (3600 * 24));
		if (today != lastMintDay) {
			dailyStart();
		}
	})
	cron.schedule("*/50 * * * * *", async () => {
		const check = await checkGasPrice()
		if (!check) return;
		if (!claimFlag) claimReward()
	})
}

//main();

claimReward()
