const mongoose = require("mongoose");

const ResourceSchema = mongoose.Schema({
  title: { type: String },
  content: { type: String },
  type: { type: String },
});

const Resource = mongoose.Model("Resource", ResourceSchema);

module.exports = Resource;
