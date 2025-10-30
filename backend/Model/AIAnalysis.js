const mongoose = require("mongoose");

const AIAnalysisSchema = mongoose.Schema({
  questionText: { type: String },
  yourAnswer: { type: String },
  correctAnswer: { type: String },
  explanation: { type: String },
  remedialTopic: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const AIAnalysis = mongoose.model("AIAnalysis", AIAnalysisSchema);

module.exports = AIAnalysis;
