const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  name: { type: String },
  role: { type: String },
  points: { type: Number },
});

const User = mongoose.Model("User", UserSchema);

module.exports = User;
