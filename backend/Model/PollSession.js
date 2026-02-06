const mongoose = require('mongoose');

const PollSessionSchema = mongoose.Schema({
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
  votes: [{ type: Number, default: 0 }],
  voters: [{ type: String }], // optional: store user ids to prevent duplicate votes
  currentQuestionIndex: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  active: { type: Boolean, default: true },
});

const PollSession = mongoose.model('PollSession', PollSessionSchema);

module.exports = PollSession;
