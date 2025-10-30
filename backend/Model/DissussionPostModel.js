const mongoose = require("mongoose");

const DiscussionPostSchema = mongoose.Schema({
  title: { type: String },
  content: { type: String },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "DiscussionReply" }],
});

const DiscussionPost = mongoose.model("DiscussionPost", DiscussionPostSchema);

module.exports = DiscussionPost;
