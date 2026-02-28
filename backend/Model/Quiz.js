const mongoose = require("mongoose");

const QuizSchema = mongoose.Schema({
  title: { type: String },
  category: { type: String, default: "General" },
  questionPool: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  // createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  isPractice: { type: Boolean, default: false },
});

const Quiz = mongoose.model("Quiz", QuizSchema);

module.exports = Quiz;
