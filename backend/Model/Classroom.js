const mongoose = require("mongoose");

const ClassroomSchema = mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    classCode: { type: String, required: true, unique: true },
    isMeetingLive: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

const Classroom = mongoose.model("Classroom", ClassroomSchema);

module.exports = Classroom;
