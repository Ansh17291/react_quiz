const mongoose = require("mongoose");

const QuizSchema = mongoose.Schema({
  title: { type: String },
  questionPool: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  // createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

const Quiz = mongoose.model("Quiz", QuizSchema);

module.exports = Quiz;
