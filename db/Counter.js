const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // The name of the counter (e.g., 'userId')
  seq: { type: Number, default: 0 }, // The sequence number
});

const Counter = mongoose.model("Counter", counterSchema);
module.exports = Counter;
