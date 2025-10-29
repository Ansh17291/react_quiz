const mongoose = require("mongoose");

const QuizSchema = mongoose.Schema({
  title: { type: String },
  questionPool: [{ type: mongoose.Schema.Types.ObjectId }], // Changed from 'questions' to 'questionPool'
  createdBy: { type: String },
});

const Quiz = mongoose.Model("Quiz", QuizSchema);

module.exports = Quiz;
