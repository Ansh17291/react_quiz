const mongoose = require("mongoose");

const ChatMessageSchema = mongoose.Schema({
  role: { type: String, required: true },
  parts: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);

module.exports = ChatMessage;
