const mongoose = require("mongoose");

const QuizResultSchema = mongoose.Schema({
  quizId: { type: String },
  userId: { type: String },
  score: { type: Number }, // as a percentage
  answers: [{ type: mongoose.Schema.Types.ObjectId }],
  timeTaken: { type: Number }, // in seconds
  submittedAt: { type: Date, default: Date.now },
});

const QuizResult = mongoose.Model("QuizResult", QuizResultSchema);

module.exports = QuizResult;
