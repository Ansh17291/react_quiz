const mongoose = require("mongoose");

const ChatMessageSchema = mongoose.Schema({
  role: { type: String, required: true },
  parts: { type: String, required: true },
});

const ChatMessage = mongoose.Model("ChatMessage", ChatMessageSchema);

module.exports = ChatMessage;
