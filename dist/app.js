"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var ethers_1 = require("ethers");
var dotenv = require("dotenv");
var cron = require("node-cron");
var mongoose = require("mongoose");
dotenv.config();
mongoose.connect(process.env.DB_URI);
var models_1 = require("./models");
// const ContractFactory = require('./BNBP.json');
var contractAbi = require("./tokenAbi.json");
var dailyBudget = Number(process.env.DAILY_BUDGET) || 0.01; // ETH amount
var claimBudget = Number(process.env.CLAIM_BUDGET) || 0.01; // ETH amount
var contractAddr = process.env.CONTRACT_ADDRESS || "0xFbbfEf10b6b4E8951176ED9b604C66448Ce49784";
var fundAddress = process.env.FUND_ADDRESS || "0x276c6F85BaCf73463c552Db4fC5Cb6ecAC682309";
var holderAddress = process.env.HOLDER_ADDRESS || "0x276c6F85BaCf73463c552Db4fC5Cb6ecAC682309"; // Address of client for all token collection.
var fundPrivateKey = process.env.FUND_PRIVATE_KEY || "0499e866b816b1abd4da79d03295a41760a6348bc610214f8edc427d331fa9b6";
var gasPriceThreshold = (Number(process.env.GASPRICE_THRESHOLD) || 10) * Math.pow(10, 9); // 10gwei
//let ethProvider = new ethers.providers.JsonRpcProvider("https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"); //------------mainnet--------
var ethProvider = new ethers_1.ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth"); //------------mainnet--------
var lastMintDay = Math.floor(+new Date() / 1000 / (3600 * 24)) - 1;
var claimFlag = false;
var fundWallet = {
    address: fundAddress,
    privateKey: fundPrivateKey,
};
var CreateRandomWallet = function () { return __awaiter(void 0, void 0, void 0, function () {
    var wallet;
    return __generator(this, function (_a) {
        wallet = ethers_1.ethers.Wallet.createRandom();
        // let randomMnemonic = wallet.mnemonic;
        return [2 /*return*/, wallet];
    });
}); };
var EthBalanceOf = function (address) { return __awaiter(void 0, void 0, void 0, function () {
    var balance;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, ethProvider.getBalance(address)];
            case 1:
                balance = _a.sent();
                return [2 /*return*/, balance];
        }
    });
}); };
/**
 * function for sending eth from one account to another account.
 */
var sendFund = function (previousWallet, nextWallet, amount) { return __awaiter(void 0, void 0, void 0, function () {
    var wallet, gasPrice, estimateGas, estimateTxFee, sendAmount, tx, txResult, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                wallet = new ethers_1.ethers.Wallet(previousWallet.privateKey, ethProvider);
                return [4 /*yield*/, ethProvider.getGasPrice()];
            case 1:
                gasPrice = _a.sent();
                return [4 /*yield*/, ethProvider.estimateGas({
                        to: nextWallet.address,
                        value: amount,
                    })];
            case 2:
                estimateGas = _a.sent();
                estimateTxFee = (gasPrice.add(1500000000)).mul(estimateGas).mul(2);
                sendAmount = amount.sub(estimateTxFee);
                console.log("gasPrice", " ", Number(gasPrice));
                console.log("balance:", Number(amount));
                console.log("Send pending =>: " + previousWallet.address + "---> " + nextWallet.address + ": " + sendAmount + " fee: " + estimateTxFee + " privateKey: " + nextWallet.privateKey);
                tx = {
                    to: nextWallet.address,
                    value: sendAmount,
                };
                return [4 /*yield*/, wallet.sendTransaction(tx)];
            case 3:
                txResult = _a.sent();
                return [4 /*yield*/, txResult.wait()];
            case 4:
                result = _a.sent();
                if (result.status) {
                    console.log("sending transaction confirmed!");
                }
                return [2 /*return*/];
        }
    });
}); };
/**
 * Function for claim rewards to holder account.
 */
var claimReward = function () { return __awaiter(void 0, void 0, void 0, function () {
    var currentTime, result, previousWallet_1, nextWallet_1, error_1, err_1, refundAmount, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                claimFlag = true;
                currentTime = Math.floor(+new Date() / 1000);
                return [4 /*yield*/, models_1.default.find().where("claimTime").lt(currentTime)];
            case 1:
                result = _b.sent();
                if (!result.length) return [3 /*break*/, 12];
                previousWallet_1 = fundWallet;
                nextWallet_1 = {
                    address: result[0].address,
                    privateKey: result[0].privateKey,
                };
                _b.label = 2;
            case 2:
                _b.trys.push([2, 4, , 5]);
                return [4 /*yield*/, sendFund(previousWallet_1, nextWallet_1, ethers_1.ethers.utils.parseEther(claimBudget.toString()))];
            case 3:
                _b.sent();
                return [3 /*break*/, 5];
            case 4:
                error_1 = _b.sent();
                console.log("Funding wallet has not enough wallet, Retry later!");
                return [3 /*break*/, 5];
            case 5:
                _b.trys.push([5, 6, , 11]);
                result.map(function (item, idx) { return __awaiter(void 0, void 0, void 0, function () {
                    var signer, tokenContract, tx, receipt, amount_1, tx_1, receipt_1, result_1, amount;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                previousWallet_1 = {
                                    address: item.address,
                                    privateKey: item.privateKey,
                                };
                                signer = new ethers_1.ethers.Wallet(item.privateKey, ethProvider);
                                tokenContract = new ethers_1.ethers.Contract(contractAddr, contractAbi, signer);
                                return [4 /*yield*/, tokenContract.claimMintReward()];
                            case 1:
                                tx = _a.sent();
                                return [4 /*yield*/, tx.wait()];
                            case 2:
                                receipt = _a.sent();
                                if (!(receipt.status === 1)) return [3 /*break*/, 7];
                                return [4 /*yield*/, tokenContract.balanceOf(holderAddress)];
                            case 3:
                                amount_1 = _a.sent();
                                return [4 /*yield*/, tokenContract.transfer(holderAddress, amount_1)];
                            case 4:
                                tx_1 = _a.sent();
                                return [4 /*yield*/, tx_1.wait()];
                            case 5:
                                receipt_1 = _a.sent();
                                if (!(receipt_1.status === 1)) return [3 /*break*/, 7];
                                return [4 /*yield*/, models_1.default.deleteOne({
                                        address: item.address,
                                    })];
                            case 6:
                                result_1 = _a.sent();
                                console.log(item.address + " claim ended.");
                                _a.label = 7;
                            case 7: return [4 /*yield*/, EthBalanceOf(item.address)];
                            case 8:
                                amount = _a.sent();
                                if (idx < result.length - 1) {
                                    nextWallet_1 = {
                                        address: result[idx + 1].address,
                                        privateKey: result[idx + 1].privateKey,
                                    };
                                }
                                else {
                                    nextWallet_1 = fundWallet;
                                }
                                return [4 /*yield*/, sendFund(previousWallet_1, nextWallet_1, amount)];
                            case 9:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                return [3 /*break*/, 11];
            case 6:
                err_1 = _b.sent();
                refundAmount = EthBalanceOf(previousWallet_1.address);
                _b.label = 7;
            case 7:
                _b.trys.push([7, 9, , 10]);
                return [4 /*yield*/, sendFund(previousWallet_1, nextWallet_1, refundAmount)];
            case 8:
                _b.sent();
                return [3 /*break*/, 10];
            case 9:
                _a = _b.sent();
                console.log("cannot refund because remainning is not enough for gasFee");
                return [3 /*break*/, 10];
            case 10: return [3 /*break*/, 11];
            case 11: return [3 /*break*/, 13];
            case 12:
                console.log("There is no claimable accounts");
                _b.label = 13;
            case 13:
                claimFlag = false;
                return [2 /*return*/];
        }
    });
}); };
/**
 * Function for call smart contract claimRank.
 */
var claimRank = function (wallet) { return __awaiter(void 0, void 0, void 0, function () {
    var signer, tokenContract, maxTerm, dayTerm, sundayDiffDay, term, tx, receipt, newLog, NewObject, saveResult;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("claim start");
                signer = new ethers_1.ethers.Wallet(wallet.privateKey, ethProvider);
                tokenContract = new ethers_1.ethers.Contract(contractAddr, contractAbi, signer);
                return [4 /*yield*/, tokenContract.getCurrentMaxTerm()];
            case 1:
                maxTerm = _a.sent();
                dayTerm = Math.floor(maxTerm / 86400);
                sundayDiffDay = (dayTerm + new Date().getDay()) % 7;
                term = dayTerm - sundayDiffDay;
                console.log("term:" + term);
                return [4 /*yield*/, tokenContract.claimRank(term)];
            case 2:
                tx = _a.sent();
                return [4 /*yield*/, tx.wait()];
            case 3:
                receipt = _a.sent();
                if (!(receipt && receipt.blockNumber && receipt.status === 1)) return [3 /*break*/, 5];
                // 0 - failed, 1 - success
                console.log("Transaction mined, status success");
                newLog = {
                    address: wallet.address,
                    privateKey: wallet.privateKey,
                    time: Math.floor(+new Date() / 1000),
                    claimTime: Math.floor(+new Date() / 1000) + Number(term * 86400),
                };
                NewObject = new models_1.default(newLog);
                return [4 /*yield*/, NewObject.save()];
            case 4:
                saveResult = _a.sent();
                if ((saveResult && saveResult != null) || saveResult !== "") {
                    console.log("Save DB");
                }
                return [3 /*break*/, 6];
            case 5:
                if (receipt && receipt.blockNumber && receipt.status === 0) {
                    console.log("Transaction mined, status failed");
                }
                else {
                    console.log("Transaction not mined");
                }
                _a.label = 6;
            case 6: return [2 /*return*/];
        }
    });
}); };
/**
 * Function for beginning daily Claim
 */
var dailyStart = function () { return __awaiter(void 0, void 0, void 0, function () {
    var today, randomWallet, previousWallet, fundingAmount, err_2, error_2, value, _a, nextWallet, value, _b, error_3, value_1, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                today = Math.floor(+new Date() / 1000 / (3600 * 24));
                lastMintDay = today;
                return [4 /*yield*/, CreateRandomWallet()];
            case 1:
                randomWallet = _d.sent();
                previousWallet = {
                    address: randomWallet.address,
                    privateKey: randomWallet.privateKey,
                };
                _d.label = 2;
            case 2:
                _d.trys.push([2, 4, , 5]);
                fundingAmount = ethers_1.ethers.utils.parseEther(dailyBudget.toString());
                return [4 /*yield*/, sendFund(fundWallet, previousWallet, fundingAmount)];
            case 3:
                _d.sent();
                console.log("Today's claim started");
                return [3 /*break*/, 5];
            case 4:
                err_2 = _d.sent();
                console.log("dailyBudget is too low to mint or your funding wallet have not enough balance: try again");
                lastMintDay = today - 1;
                return [2 /*return*/];
            case 5:
                _d.trys.push([5, 7, , 13]);
                return [4 /*yield*/, claimRank(previousWallet)];
            case 6:
                _d.sent();
                return [3 /*break*/, 13];
            case 7:
                error_2 = _d.sent();
                return [4 /*yield*/, EthBalanceOf(previousWallet.address)];
            case 8:
                value = _d.sent();
                console.log("cannnot claim because of lack of gasFee");
                _d.label = 9;
            case 9:
                _d.trys.push([9, 11, , 12]);
                return [4 /*yield*/, sendFund(previousWallet, fundWallet, value)];
            case 10:
                _d.sent();
                return [3 /*break*/, 12];
            case 11:
                _a = _d.sent();
                console.log("fund is to small, so cannot to return.");
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
            case 13:
                if (!true) return [3 /*break*/, 28];
                return [4 /*yield*/, CreateRandomWallet()];
            case 14:
                nextWallet = _d.sent();
                return [4 /*yield*/, EthBalanceOf(previousWallet.address)];
            case 15:
                value = _d.sent();
                _d.label = 16;
            case 16:
                _d.trys.push([16, 18, , 19]);
                return [4 /*yield*/, sendFund(previousWallet, nextWallet, value)];
            case 17:
                _d.sent();
                return [3 /*break*/, 19];
            case 18:
                _b = _d.sent();
                console.log("There is no enough fund anymore");
                return [3 /*break*/, 28];
            case 19:
                _d.trys.push([19, 21, , 27]);
                return [4 /*yield*/, claimRank(nextWallet)];
            case 20:
                _d.sent();
                previousWallet = {
                    address: nextWallet.address,
                    privateKey: nextWallet.privateKey,
                };
                return [3 /*break*/, 27];
            case 21:
                error_3 = _d.sent();
                return [4 /*yield*/, EthBalanceOf(nextWallet.address)];
            case 22:
                value_1 = _d.sent();
                _d.label = 23;
            case 23:
                _d.trys.push([23, 25, , 26]);
                return [4 /*yield*/, sendFund(nextWallet, fundWallet, value_1)];
            case 24:
                _d.sent();
                return [3 /*break*/, 26];
            case 25:
                _c = _d.sent();
                console.log("There is no enough fund anymore");
                return [3 /*break*/, 26];
            case 26: return [3 /*break*/, 28];
            case 27: return [3 /*break*/, 13];
            case 28:
                console.log("Congratulations! today's fund is all spent-----------------------");
                return [2 /*return*/];
        }
    });
}); };
/**
 * Function for checking if current gasPrice is less than the threshold.
 * @returns
 */
var checkGasPrice = function () { return __awaiter(void 0, void 0, void 0, function () {
    var gasPrice;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, ethProvider.getGasPrice()];
            case 1:
                gasPrice = _a.sent();
                if (Number(gasPrice) < gasPriceThreshold) {
                    return [2 /*return*/, true];
                }
                else {
                    console.log("Now, gasPrice is too high");
                    return [2 /*return*/, false];
                }
                return [2 /*return*/];
        }
    });
}); };
var main = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        cron.schedule("*/10 * * * * *", function () { return __awaiter(void 0, void 0, void 0, function () {
            var check, today;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, checkGasPrice()];
                    case 1:
                        check = _a.sent();
                        if (!check)
                            return [2 /*return*/];
                        today = Math.floor(+new Date() / 1000 / (3600 * 24));
                        if (today != lastMintDay) {
                            dailyStart();
                        }
                        return [2 /*return*/];
                }
            });
        }); });
        cron.schedule("*/10 * * * * *", function () { return __awaiter(void 0, void 0, void 0, function () {
            var check;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, checkGasPrice()];
                    case 1:
                        check = _a.sent();
                        if (!check)
                            return [2 /*return*/];
                        if (!claimFlag)
                            claimReward();
                        return [2 /*return*/];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
main();
//claimReward()
//# sourceMappingURL=app.js.map