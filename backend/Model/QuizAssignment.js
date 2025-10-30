const mongoose = require("mongoose");

const QuizAssignmentSchema = mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  deadline: { type: Date },
  timeLimit: { type: Number },
  numQuestionsToAssign: { type: Number },
  isLive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const QuizAssignment = mongoose.model("QuizAssignment", QuizAssignmentSchema);

module.exports = QuizAssignment;
