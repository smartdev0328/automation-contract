import mongoose from 'mongoose';
var Schema = mongoose.Schema;

var lists = new Schema({
    address: { type: String },
    privateKey: { type: String },
    time: { type: Number },
    claimTime: { type: Number }
}, { timestamps: true });
let model = mongoose.model('lists', lists);
export default model;