const mongoose = require('mongoose');

const PollQuestionSchema = mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String }],
});

const PollSchema = mongoose.Schema({
  title: { type: String },
  questions: [PollQuestionSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const Poll = mongoose.model('Poll', PollSchema);

module.exports = Poll;
