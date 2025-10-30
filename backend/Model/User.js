const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = mongoose.Schema({
  name: { type: String },
  role: { type: String },
  points: { type: Number, default: 0 },
  // optional password for auth routes
  password: { type: String },
});

UserSchema.pre("save", async function () {
  this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
