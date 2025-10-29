const mongoose = require("mongoose");

const QuizAssignmentSchema = mongoose.Schema({
  id: { type: String },
  questionText: { type: String },
  options: [{ type: String }],
  correctAnswerIndex: { type: Number },
});

const QuizAssignment = mongoose.Model("QuizAssignment", QuizAssignmentSchema);

module.exports = QuizAssignment;
