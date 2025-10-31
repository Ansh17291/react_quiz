const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = mongoose.Schema({
  name: { type: String },
  role: { type: String },
  points: { type: Number, default: 0 },
  // optional password for auth routes
  password: { type: String },
});

UserSchema.set("toJSON", {
  virtuals: false,
  transform: function (doc, ret) {
    if (ret.password) delete ret.password;
    return ret;
  },
});
UserSchema.set("toObject", { virtuals: false });

UserSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
