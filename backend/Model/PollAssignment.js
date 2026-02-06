const mongoose = require('mongoose');

const PollAssignmentSchema = mongoose.Schema({
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll' },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deadline: { type: Date },
  timeLimit: { type: Number },
  isLive: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const PollAssignment = mongoose.model('PollAssignment', PollAssignmentSchema);

module.exports = PollAssignment;
