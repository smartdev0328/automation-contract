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
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/claim_lists');
var models_1 = require("./models");
// const ContractFactory = require('./BNBP.json');
var contractAbi = require("./tokenAbi.json");
dotenv.config();
var dailyBudget = 0.005; // ETH amount
var claimBudget = 0.005; // ETH amount
var contractAddr = '0xFbbfEf10b6b4E8951176ED9b604C66448Ce49784';
var fundAddress = '0x276c6F85BaCf73463c552Db4fC5Cb6ecAC682309';
var holderAddress = '0x276c6F85BaCf73463c552Db4fC5Cb6ecAC682309'; // Address of client for all token collection.
var fundPrivateKey = '0499e866b816b1abd4da79d03295a41760a6348bc610214f8edc427d331fa9b6';
var network = 'goerli';
var gasFee = 0; //Gas units (limit) * Gas price per unit (in gwei) = Gas fee
var customWsProvider = ethers_1.ethers.getDefaultProvider(network);
var nextDay = Math.floor(+new Date() / 1000 / (3600 * 24));
var claimFlag = false;
var fundWallet = {
    address: fundAddress,
    privateKey: fundPrivateKey
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
    var provider, balance;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                provider = ethers_1.ethers.getDefaultProvider(network);
                return [4 /*yield*/, provider.getBalance(address)];
            case 1:
                balance = _a.sent();
                return [2 /*return*/, balance];
        }
    });
}); };
var Fund = function (previousWallet, nextWallet, value) { return __awaiter(void 0, void 0, void 0, function () {
    var wallet, value_, gasPrice, estimateTxFee, maxValue, tx, txResult, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                wallet = new ethers_1.ethers.Wallet(previousWallet.privateKey, customWsProvider);
                value_ = ethers_1.ethers.utils.formatUnits(value, 18);
                console.log("aaa+" + value_);
                return [4 /*yield*/, customWsProvider.getGasPrice()];
            case 1:
                gasPrice = _a.sent();
                console.log(gasPrice);
                estimateTxFee = gasPrice.mul(21000);
                maxValue = Number(value_) - Number(ethers_1.ethers.utils.formatUnits(estimateTxFee, 18));
                console.log("funding:", maxValue);
                tx = {
                    to: nextWallet.address,
                    value: ethers_1.ethers.utils.parseEther(maxValue.toString())
                };
                return [4 /*yield*/, wallet.sendTransaction(tx)];
            case 2:
                txResult = _a.sent();
                return [4 /*yield*/, txResult.wait()];
            case 3:
                result = _a.sent();
                console.log("fund status:" + result.status);
                return [2 /*return*/];
        }
    });
}); };
var claimReward = function () { return __awaiter(void 0, void 0, void 0, function () {
    var currentTime, result_1, previousWallet_1, nextWallet_1, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                claimFlag = true;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                currentTime = Math.floor(+new Date() / 1000);
                console.log(currentTime);
                return [4 /*yield*/, models_1.default.find({
                        claimTime: { $gt: currentTime, $lt: 0 },
                    })];
            case 2:
                result_1 = _a.sent();
                if (!result_1.length) return [3 /*break*/, 4];
                console.log("claim possible addresses: " + result_1);
                previousWallet_1 = fundWallet;
                nextWallet_1 = { address: result_1[0].address, privateKey: result_1[0].privateKey };
                return [4 /*yield*/, Fund(previousWallet_1, nextWallet_1, claimBudget)];
            case 3:
                _a.sent();
                result_1.map(function (item, idx) { return __awaiter(void 0, void 0, void 0, function () {
                    var signer, tokenContract, tx, receipt, amount, tx_1, receipt_1, result_2, value;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                signer = new ethers_1.ethers.Wallet(item.privateKey, customWsProvider);
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
                                amount = _a.sent();
                                return [4 /*yield*/, tokenContract.transfer(holderAddress, amount)];
                            case 4:
                                tx_1 = _a.sent();
                                return [4 /*yield*/, tx_1.wait()];
                            case 5:
                                receipt_1 = _a.sent();
                                if (!(receipt_1.status === 1)) return [3 /*break*/, 7];
                                return [4 /*yield*/, models_1.default.deleteOne({
                                        address: item.address
                                    })];
                            case 6:
                                result_2 = _a.sent();
                                console.log(item.address + " claim ended.");
                                _a.label = 7;
                            case 7: return [4 /*yield*/, EthBalanceOf(item.address)];
                            case 8:
                                value = _a.sent();
                                if (idx < result_1.length) {
                                    nextWallet_1 = {
                                        address: result_1[idx + 1].address,
                                        privateKey: result_1[idx + 1].privateKey,
                                    };
                                }
                                else {
                                    nextWallet_1 = fundWallet;
                                }
                                previousWallet_1 = {
                                    address: item.address,
                                    privateKey: item.privateKey,
                                };
                                return [4 /*yield*/, Fund(previousWallet_1, nextWallet_1, value)];
                            case 9:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                _a.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                error_1 = _a.sent();
                console.log('claimReward error : ');
                return [3 /*break*/, 6];
            case 6:
                claimFlag = false;
                return [2 /*return*/];
        }
    });
}); };
var claimMint = function (wallet) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, signer, tokenContract, maxTerm, tx, receipt, newLog, NewObject, saveResult;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                console.log('start');
                _b = (_a = console).log;
                return [4 /*yield*/, EthBalanceOf(wallet.address)];
            case 1:
                _b.apply(_a, [_c.sent()]);
                signer = new ethers_1.ethers.Wallet(wallet.privateKey, customWsProvider);
                tokenContract = new ethers_1.ethers.Contract(contractAddr, contractAbi, signer);
                return [4 /*yield*/, tokenContract.getCurrentMaxTerm()];
            case 2:
                maxTerm = _c.sent();
                console.log("term:" + maxTerm);
                return [4 /*yield*/, tokenContract.claimRank(Math.floor(maxTerm / 86400))];
            case 3:
                tx = _c.sent();
                return [4 /*yield*/, tx.wait()];
            case 4:
                receipt = _c.sent();
                if (!(receipt && receipt.blockNumber && receipt.status === 1)) return [3 /*break*/, 6];
                console.log("Transaction mined, status success");
                newLog = {
                    address: wallet.address,
                    privateKey: wallet.privateKey,
                    time: Math.floor(+new Date() / 1000),
                    claimTime: Math.floor(+new Date() / 1000) + Number(maxTerm)
                };
                NewObject = new models_1.default(newLog);
                return [4 /*yield*/, NewObject.save()];
            case 5:
                saveResult = _c.sent();
                if (saveResult && saveResult != null || saveResult !== '') {
                    console.log('Save DB');
                }
                return [3 /*break*/, 7];
            case 6:
                if (receipt && receipt.blockNumber && receipt.status === 0) {
                    console.log("Transaction mined, status failed");
                }
                else {
                    console.log("Transaction not mined");
                }
                _c.label = 7;
            case 7: return [2 /*return*/];
        }
    });
}); };
var dailyStart = function () { return __awaiter(void 0, void 0, void 0, function () {
    var today, randomWallet, previousWallet, error_2, nextWallet, value, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('Hello. let`s go to auto-mint');
                today = Math.floor(+new Date() / 1000 / (3600 * 24));
                if (!(today === nextDay)) return [3 /*break*/, 15];
                nextDay = today + 1;
                return [4 /*yield*/, CreateRandomWallet()];
            case 1:
                randomWallet = _a.sent();
                previousWallet = {
                    address: randomWallet.address,
                    privateKey: randomWallet.privateKey
                };
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 6]);
                return [4 /*yield*/, Fund(fundWallet, previousWallet, ethers_1.ethers.utils.parseEther(dailyBudget.toString()))];
            case 3:
                _a.sent();
                return [4 /*yield*/, claimMint(previousWallet)];
            case 4:
                _a.sent();
                return [3 /*break*/, 6];
            case 5:
                error_2 = _a.sent();
                console.log("today's fund is all spent");
                return [3 /*break*/, 6];
            case 6: return [4 /*yield*/, CreateRandomWallet()];
            case 7:
                nextWallet = _a.sent();
                _a.label = 8;
            case 8:
                _a.trys.push([8, 12, , 13]);
                return [4 /*yield*/, EthBalanceOf(previousWallet.address)];
            case 9:
                value = _a.sent();
                return [4 /*yield*/, Fund(previousWallet, nextWallet, value)];
            case 10:
                _a.sent();
                return [4 /*yield*/, claimMint(nextWallet)];
            case 11:
                _a.sent();
                previousWallet = {
                    address: nextWallet.address,
                    privateKey: nextWallet.privateKey
                };
                return [3 /*break*/, 13];
            case 12:
                error_3 = _a.sent();
                console.log("today's fund is all spent-----------------------");
                return [3 /*break*/, 14];
            case 13: return [3 /*break*/, 6];
            case 14: return [3 /*break*/, 16];
            case 15:
                console.log("today, you already spent your daily budget.");
                _a.label = 16;
            case 16: return [2 /*return*/];
        }
    });
}); };
var main = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        console.log(gasFee);
        cron.schedule("*/5 * * * * *", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                dailyStart();
                return [2 /*return*/];
            });
        }); });
        cron.schedule("*/5 * * * * *", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!claimFlag)
                    claimReward();
                return [2 /*return*/];
            });
        }); });
        return [2 /*return*/];
    });
}); };
main();
// .then(() => {
// 	console.log('finished');
// })
// .catch((error) => {
// 	console.log(error);
// });
//# sourceMappingURL=app.js.map