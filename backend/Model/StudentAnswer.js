const mongoose = require("mongoose");

const StudentAnswerSchema = mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  answerIndex: { type: Number },
  answerText: { type: String },
  submittedAt: { type: Date, default: Date.now },
});

const StudentAnswer = mongoose.model("StudentAnswer", StudentAnswerSchema);

module.exports = StudentAnswer;
