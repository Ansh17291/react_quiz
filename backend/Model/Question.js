const mongoose = require("mongoose");

const QuestionSchema = mongoose.Schema({
  questionText: { type: String },
  options: [{ type: String }],
  correctAnswerIndex: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

const Question = mongoose.model("Question", QuestionSchema);

module.exports = Question;
