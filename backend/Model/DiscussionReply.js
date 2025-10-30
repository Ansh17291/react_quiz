const mongoose = require("mongoose");

const DiscussionReplySchema = mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const DiscussionReply = mongoose.model(
  "DiscussionReply",
  DiscussionReplySchema
);

module.exports = DiscussionReply;
