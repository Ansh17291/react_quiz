const mongoose = require("mongoose");

const QuizAssignmentSchema = mongoose.Schema({
  quizId: { type: String },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // 'ALL' or array of user IDs
  deadline: { type: String }, // ISO {type:String},
  timeLimit: { type: Number }, // Optional time limit in minutes
  numQuestionsToAssign: { type: Number }, // How many questions to pull from the pool
  isLive: { type: Boolean }, // Flag for live quizzes
});

const QuizAssignment = mongoose.Model("QuizAssignment", QuizAssignmentSchema);

module.exports = QuizAssignment;
