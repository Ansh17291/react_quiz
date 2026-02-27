const mongoose = require("mongoose");

const ResourceSchema = mongoose.Schema({
  title: { type: String },
  content: { type: String },
  type: { type: String },
  classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom" },
  createdAt: { type: Date, default: Date.now },
});

const Resource = mongoose.model("Resource", ResourceSchema);

module.exports = Resource;
