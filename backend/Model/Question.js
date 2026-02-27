const mongoose = require("mongoose");

const QuestionSchema = mongoose.Schema({
  questionText: { type: String },
  type: { type: String, enum: ['multiple-choice', 'text'], default: 'multiple-choice' },
  options: [{ type: String }],
  correctAnswerIndex: { type: Number },
  correctTextAnswer: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Question = mongoose.model("Question", QuestionSchema);

module.exports = Question;
