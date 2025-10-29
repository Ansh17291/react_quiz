const mongoose = require("mongoose");

const StudentAnswerSchema = mongoose.Schema({
  questionId: { type: String },
  selectedOptionIndex: { type: Number },
  isCorrect: { type: Boolean },
});

const StudentAnswer = mongoose.Model("StudentAnswer", StudentAnswerSchema);

module.exports = StudentAnswer;
