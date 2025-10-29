const mongoose = require("mongoose");

const DiscussionPostSchema = mongoose.Schema({
  title: { type: String },
  content: { type: String },
  authorId: { type: String },
  createdAt: { type: Date, default: Date.now },
  replies: { type: mongoose.Schema.Types.ObjectId, ref: "DiscussionReply" },
});

const DiscussionPost = mongoose.Model("DiscussionPost", DiscussionPostSchema);

module.exports = DiscussionPost;
