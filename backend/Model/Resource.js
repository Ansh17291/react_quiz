const mongoose = require("mongoose");

const ResourceSchema = mongoose.Schema({
  title: { type: String },
  content: { type: String },
  type: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Resource = mongoose.model("Resource", ResourceSchema);

module.exports = Resource;
