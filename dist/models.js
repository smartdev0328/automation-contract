"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var Schema = mongoose_1.default.Schema;
var lists = new Schema({
    address: { type: String },
    privateKey: { type: String },
    time: { type: Number },
    claimTime: { type: Number }
}, { timestamps: true });
var model = mongoose_1.default.model('lists', lists);
exports.default = model;
//# sourceMappingURL=models.js.map