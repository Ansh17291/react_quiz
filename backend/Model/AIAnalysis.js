const mongoose = require("mongoose");

const AIAnalysisSchema = mongoose.Schema({
  questionText: { type: String },
  yourAnswer: { type: String },
  correctAnswer: { type: String },
  explanation: { type: String },
  remedialTopic: { type: String },
});

const AIAnalysis = mongoose.Model("AIAnalysis", AIAnalysisSchema);

module.exports = AIAnalysis;
