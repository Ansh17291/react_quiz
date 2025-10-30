require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 8080;

// middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
mongoose
  .connect(MONGODB_URI, { dbName: process.env.DB_NAME || "intelliquiz" })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Mongo connection error:", err));

// models
const User = require("./Model/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Resource = require("./Model/Resource");
const DiscussionPost = require("./Model/DissussionPostModel");
const DiscussionReply = require("./Model/DiscussionReply");
const Quiz = require("./Model/Quiz");
const Question = require("./Model/Question");
const QuizResult = require("./Model/QuizResult");
const QuizAssignment = require("./Model/QuizAssignment");

// Health
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Users
app.get("/api/users", async (req, res) => {
  const users = await User.find().lean();
  res.json(users);
});

app.get("/api/assignment", async (req, res) => {
  const assignments = await QuizAssignment.find();
  res.json(assignments);
});

app.get("/api/results", async (req, res) => {
  const results = await QuizResult.find();
  res.json(results);
});

app.get("/api/assignment/:id", async (req, res) => {
  const assignmentId = req.params.id;

  // Example: filter results by assignmentId
  const results = await QuizAssignment.findById(assignmentId);

  res.json(results);
});

app.get("/api/quizzes", async (req, res) => {
  const quiz = await Quiz.find().populate("questionPool");
  res.json(quiz);
});

app.post("/api/quizzes/:quizID/submit", async (req, res) => {
  console.log(req.body.result);

  const results = await QuizResult.create({
    quizId: req.body.result.quizId,
    userId: req.body.result.userId,
    score: req.body.result.score,
    answers: req.body.result.answers,
  });
  res.json(results);
});

app.post("/api/users", async (req, res) => {
  const data = req.body;
  const user = await User.create(data);
  res.status(201).json(user);
});

// --- AUTH ---
const JWT_SECRET = process.env.JWT_SECRET || "changeme";

function signToken(user) {
  return jwt.sign(
    { id: user._id, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

app.post("/api/user/student-login", async (req, res) => {
  const { name, password } = req.body;

  console.log(name);
  if (!name || !password)
    return res.status(400).json({ error: "name and password required" });
  const user = await User.findOne({ name });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password || "");
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken(user);
  res.json({ user, token });
});

app.post("/api/user/teacher-login", async (req, res) => {
  const { name, password } = req.body;

  console.log(name, password);

  if (!name || !password)
    return res.status(400).json({ error: "name and password required" });
  const user = await User.findOne({ name });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password || "");
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken(user);
  res.json({ user, token });
});

// Resources
app.get("/api/resources", async (req, res) => {
  const items = await Resource.find().lean();
  res.json(items);
});

app.post("/api/resources", async (req, res) => {
  const item = await Resource.create(req.body);
  res.status(201).json(item);
});

// Discussion posts
app.get("/api/posts", async (req, res) => {
  const posts = await DiscussionPost.find().populate("replies").lean();
  res.json(posts);
});

app.post("/api/delete", async (req, res) => {
  const user = await User.findByIdAndDelete(req.body.userId);
  console.log(user);
  const users = await User.find({});

  res.status(201).json(users);
});

app.post("/api/create-quiz", async (req, res) => {
  try {
    console.log(req.body.assignment);

    const questionIds = await Promise.all(
      req.body.pool.map(async (individual) => {
        const question = await Question.create({
          questionText: individual.questionText,
          options: individual.options,
          correctAnswerIndex: individual.correctAnswerIndex,
        });
        return question._id;
      })
    );

    const newQuiz = await Quiz.create({
      title: req.body.quiz.title,
      questionPool: questionIds,
    });

    const newAssignment = await QuizAssignment.create({
      quizId: newQuiz._id,
      studentIds: [...req.body.assignment.studentIds],
      deadline: req.body.assignment.deadline,
      timeLimit: req.body.assignment.timeLimit,
      isLive: req.body.assignment.isLive,
      numQuestionsToAssign: req.body.assignment.numQuestionsToAssign,
    });

    res.status(201).json({ quiz: newQuiz, assignment: newAssignment });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

app.post("/api/user/signup", async (req, res) => {
  const name = req.body.username;
  const password = req.body.password;

  const does_exits = await User.findOne({ name });
  if (does_exits) {
    res.json({ message: "User exists" });
  }

  const user = await User.create({
    name,
    role: "STUDENT",
    password,
  });
  res.status(200).json(user);
});

// catch-all error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Listening on PORT: ${PORT}`);
});
