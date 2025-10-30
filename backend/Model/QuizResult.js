const mongoose = require("mongoose");

const QuizResultSchema = mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  score: { type: Number },
  answers: [{ type: mongoose.Schema.Types.Mixed }],
  timeTaken: { type: Number },
  submittedAt: { type: Date, default: Date.now },
});

const QuizResult = mongoose.model("QuizResult", QuizResultSchema);

module.exports = QuizResult;
