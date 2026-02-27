require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const XLSX = require("xlsx");
const mammoth = require("mammoth");
const JSZip = require("jszip");
const http = require("http");
const socketIo = require("socket.io");
const { encryptString, decryptString } = require("./utils/crypto");

const encryptKey = process.env.ENCRYPT_KEY || "my passphrase";

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

const PORT = process.env.PORT || 8080;

// middleware
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
// serve uploaded files statically
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
app.use("/uploads", express.static(UPLOAD_DIR));

// multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9-_]/gi, "_");
    cb(null, `${base}-${unique}${ext}`);
  },
});
const upload = multer({ storage });

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
const Poll = require("./Model/Poll");
const PollSession = require("./Model/PollSession");
const PollAssignment = require("./Model/PollAssignment");
const Classroom = require("./Model/Classroom");

// --- Socket.IO Namespaces ---
const leaderboardNamespace = io.of("/leaderboard");

const discussionNamespace = io.of("/discussion");

function notifyNewReply(reply) {
  discussionNamespace.emit("newReply", reply);
}

async function getLeaderboardData() {
  const topUsers = await User.find({ role: "STUDENT" })
    .sort({ points: -1 })
    .limit(10)
    .lean();
  return topUsers;
}

async function updateLeaderboard() {
  const leaderboardData = await getLeaderboardData();
  leaderboardNamespace.emit("update", leaderboardData);
}

leaderboardNamespace.on("connection", async (socket) => {
  console.log("Client connected to leaderboard");
  const leaderboardData = await getLeaderboardData();
  socket.emit("initialData", leaderboardData);
});

const assignmentsNamespace = io.of("/assignments");

function notifyNewAssignment(assignment) {
  assignmentsNamespace.emit("newAssignment", assignment);
}

function notifyDeassignQuiz(quizId, studentIds) {
  assignmentsNamespace.emit("deassignQuiz", { quizId, studentIds });
}

assignmentsNamespace.on("connection", (socket) => {
  console.log("Client connected to assignments");
});

// Health
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Users
app.get("/api/users", async (req, res) => {
  const users = await User.find().lean();
  res.json(users);
});

// Leaderboard route
app.get("/api/leaderboard", async (req, res) => {
  try {
    const leaderboardData = await getLeaderboardData();
    res.json(leaderboardData);
  } catch (error) {
    console.error("Failed to fetch leaderboard data:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard data" });
  }
});

app.post("/api/leaderboard/update", async (req, res) => {
  await updateLeaderboard();
  res.status(200).json({ message: "Leaderboard update triggered" });
});

app.get("/api/assignments", async (req, res) => {
  const assignments = await QuizAssignment.find();
  res.json(assignments);
});

// Create an assignment (intended for admins)
app.post("/api/assignments", async (req, res) => {
  try {
    const payload = req.body || {};
    const {
      quizId,
      studentIds,
      deadline,
      timeLimit,
      numQuestionsToAssign,
      isLive,
    } = payload;
    if (!quizId || !Array.isArray(studentIds)) {
      return res
        .status(400)
        .json({ error: "quizId and studentIds are required" });
    }
    const assignment = await QuizAssignment.create({
      quizId,
      studentIds,
      deadline,
      timeLimit,
      numQuestionsToAssign,
      isLive,
    });
    notifyNewAssignment(assignment);
    res.status(201).json(assignment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// Fetch assignment for a specific quiz
app.get("/api/assignments/by-quiz/:quizId", async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const assignment = await QuizAssignment.findOne({ quizId });
    res.json(assignment || null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
});

// Update (or create) assignment for a specific quiz
app.put("/api/assignments/by-quiz/:quizId", async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const { studentIds, deadline, timeLimit, isLive } = req.body || {};
    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ error: "studentIds array is required" });
    }

    const existingAssignment = await QuizAssignment.findOne({ quizId });
    const oldStudentIds = existingAssignment ? existingAssignment.studentIds.map(id => id.toString()) : [];

    const update = {
      quizId,
      studentIds,
      deadline,
      timeLimit,
      isLive,
    };
    const assignment = await QuizAssignment.findOneAndUpdate(
      { quizId },
      update,
      { new: true, upsert: true }
    );

    // Notify de-assigned students
    const deassignedStudentIds = oldStudentIds.filter(id => !studentIds.includes(id));
    if (deassignedStudentIds.length > 0) {
      notifyDeassignQuiz(quizId, deassignedStudentIds);
    }

    // Notify newly assigned students
    const newStudentIds = studentIds.filter(id => !oldStudentIds.includes(id));
    if (newStudentIds.length > 0) {
      const newAssignmentData = { ...assignment.toObject(), studentIds: newStudentIds };
      notifyNewAssignment(newAssignmentData);
    }

    res.json(assignment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

app.get("/api/results", async (req, res) => {
  const results = await QuizResult.find();
  res.json(results);
});

app.get("/api/discussions", async (req, res) => {
  const discussionsPost = await DiscussionPost.find().populate(
    "DiscussionReply"
  );
  const discussionsReply = await DiscussionReply.find();
  res.json({ post: discussionsPost, reply: discussionsReply });
});

app.post("/api/discussions", async (req, res) => {
  const discussion = await DiscussionPost.create({
    title: req.body.title,
    content: req.body.content,
    authorId: req.body.authorId,
  });

  res.json(discussion);
});

app.post("/api/discussions/reply", async (req, res) => {
  try {
    const { authorId, content } = req.body.optimistic;

    // Create the reply
    const createReply = await DiscussionReply.create({
      authorId,
      content,
    });

    // Find the main post and push the reply ID
    const mainPost = await DiscussionPost.findById(req.body.postId);
    if (!mainPost) {
      return res.status(404).json({ error: "Discussion post not found" });
    }

    mainPost.replies.push(createReply._id);
    await mainPost.save();

    notifyNewReply(createReply);

    res.json({ message: "Reply added to discussion post", reply: createReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/api/assignments/:id", async (req, res) => {
  const assignmentId = req.params.id;

  // Example: filter results by assignmentId
  const results = await QuizAssignment.findById(assignmentId);

  res.json(results);
});

app.get("/api/users/:id", async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.get("/api/quizzes", async (req, res) => {
  const quizzes = await Quiz.find().populate("questionPool").lean();
  const decrypted = (quizzes || []).map((q) => ({
    ...q,
    questionPool: (q.questionPool || []).map((ques) => ({
      ...ques,
      questionText: decryptString(ques.questionText),
      options: (ques.options || []).map((o) => decryptString(o)),
      correctTextAnswer: ques.correctTextAnswer ? decryptString(ques.correctTextAnswer) : undefined,
    })),
  }));
  res.json(decrypted);
});

app.post("/api/quizzes/:quizID/submit", async (req, res) => {
  try {
    const resultData = req.body;
    const results = await QuizResult.create({
      quizId: resultData.quizId,
      userId: resultData.userId,
      score: resultData.score,
      answers: resultData.answers,
      timeTaken: resultData.timeTaken,
      submittedAt: resultData.submittedAt,
    });

    // Find the user and add points
    const user = await User.findById(resultData.userId);
    if (user) {
      user.points = (user.points || 0) + resultData.score;
      await user.save();
    }

    //
    await updateLeaderboard();

    res.json(results);
  } catch (error) {
    console.error("Failed to submit quiz result:", error);
    res.status(500).json({ error: "Failed to submit quiz result" });
  }
});

// Create a quiz (intended for teachers)
app.post("/api/quizzes", async (req, res) => {
  try {
    const quiz = req.body || {};
    if (!quiz.title || !Array.isArray(quiz.questions)) {
      return res
        .status(400)
        .json({ error: "title and questions are required" });
    }

    const questionIds = await Promise.all(
      (quiz.questions || []).map(async (q) => {
        const created = await Question.create({
          questionText: encryptString(q.questionText),
          type: q.type || 'multiple-choice',
          options: (q.options || []).map((opt) => encryptString(opt)),
          correctAnswerIndex: q.correctAnswerIndex,
          correctTextAnswer: q.correctTextAnswer ? encryptString(q.correctTextAnswer) : undefined,
        });
        return created._id;
      })
    );

    const newQuiz = await Quiz.create({
      title: quiz.title,
      questionPool: questionIds,
    });

    res.status(201).json(newQuiz);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

app.post("/api/users", async (req, res) => {
  const data = req.body || {};
  const name = data.username || data.name;
  const user = await User.create({
    name,
    role: data.role,
    password: data.password,
    points: data.points,
  });
  res.status(201).json(user);
});

// Admin: update a user's password by id
app.put("/api/users/:id/password", async (req, res) => {
  try {
    const userId = req.params.id;
    const { password } = req.body || {};
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "password is required" });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.password = password; // pre-save hook will hash
    await user.save();
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update password" });
  }
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

// simple JWT auth middleware
function authenticateJWT(req, res, next) {
  const auth = req.headers && req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post("/api/user/student-login", async (req, res) => {
  const { name, password } = req.body;

  // console.log(name);
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

  // console.log(name, password);

  if (!name || !password)
    return res.status(400).json({ error: "name and password required" });
  const user = await User.findOne({ name });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password || "");
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken(user);
  res.json({ user, token });
});

app.post("/api/user/teacher-signup", async (req, res) => {
  const name = req.body.username;
  const password = req.body.password;

  // Check for existing user
  const existingUser = await User.findOne({ name });
  if (existingUser) {
    return res.status(400).json({ error: "User already exists" });
  }

  // Create new user
  // const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = await User.create({
    name,
    password,
    role: "TEACHER",
  });

  const token = signToken(newUser);
  res.status(201).json({ user: newUser, token });
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

app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await DiscussionPost.findById(req.params.id)
      .populate("replies")
      .lean();
    if (!post) {
      return res.status(404).json({ error: "Discussion post not found" });
    }
    res.json(post);
  } catch (error) {
    console.error("Failed to fetch discussion post:", error);
    res.status(500).json({ error: "Failed to fetch discussion post" });
  }
});

// Quizzes - return with populated questions so clients see full question pool
app.get("/api/quizzes", async (req, res) => {
  try {
    const quizzes = await Quiz.find().populate("questionPool").lean();
    const decrypted = (quizzes || []).map((q) => ({
      ...q,
      questionPool: (q.questionPool || []).map((ques) => ({
        ...ques,
        questionText: decryptString(ques.questionText),
        options: (ques.options || []).map((o) => decryptString(o)),
        correctTextAnswer: ques.correctTextAnswer ? decryptString(ques.correctTextAnswer) : undefined,
      })),
    }));
    res.json(decrypted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load quizzes" });
  }
});

// --- Polls ---
app.post("/api/polls", authenticateJWT, async (req, res) => {
  try {
    const { title, questions } = req.body || {};
    if (!questions || !Array.isArray(questions) || questions.length === 0)
      return res.status(400).json({ error: "questions are required" });
    // only TEACHER or ADMIN can create polls
    if (!req.user || !["TEACHER", "ADMIN"].includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const createdBy = req.user.id || req.user._id;
    const poll = await Poll.create({ title, questions, createdBy });
    res.status(201).json(poll);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create poll" });
  }
});

app.get("/api/polls", async (req, res) => {
  try {
    const polls = await Poll.find().lean();
    res.json(polls);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch polls" });
  }
});

// Start a poll session (create counts and expiration)
app.post("/api/polls/:id/start", authenticateJWT, async (req, res) => {
  try {
    const pollId = req.params.id;
    const { timeLimitSeconds } = req.body || {};
    const poll = await Poll.findById(pollId).lean();
    if (!poll) return res.status(404).json({ error: "Poll not found" });
    if (!req.user || !['TEACHER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // End any existing active sessions for this poll
    await PollSession.updateMany({ pollId, active: true }, { active: false });

    // initialize votes for first question
    const firstQuestion = (poll.questions || [])[0] || { options: [] };
    const votes = (firstQuestion.options || []).map(() => 0);
    const currentQuestionIndex = 0;
    const startedAt = new Date();
    const expiresAt = timeLimitSeconds ? new Date(Date.now() + timeLimitSeconds * 1000) : null;
    const session = await PollSession.create({ pollId, votes, startedAt, expiresAt, active: true, currentQuestionIndex });
    res.status(201).json(session);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to start poll session" });
  }
});

// Assign poll to students (teacher/admin only)
app.post('/api/polls/:id/assign', authenticateJWT, async (req, res) => {
  try {
    if (!req.user || !['TEACHER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const pollId = req.params.id;
    const { studentIds, deadline, timeLimit, isLive } = req.body || {};
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'studentIds array required' });
    }
    const assignment = await PollAssignment.create({ pollId, studentIds, deadline, timeLimit, isLive });
    res.status(201).json(assignment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to assign poll' });
  }
});

app.get('/api/polls/assignments/by-poll/:pollId', async (req, res) => {
  try {
    const pollId = req.params.pollId;
    const assignment = await PollAssignment.findOne({ pollId }).lean();
    res.json(assignment || null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch poll assignment' });
  }
});

// Get polls assigned to current user
app.get('/api/polls/assigned', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user._id);
    if (!userId) return res.status(400).json({ error: 'Invalid user' });
    const assignments = await PollAssignment.find({ studentIds: userId }).lean();
    const pollIds = assignments.map(a => a.pollId);
    const polls = await Poll.find({ _id: { $in: pollIds } }).lean();
    // merge assignment info into poll
    const merged = polls.map(p => {
      const assign = assignments.find(a => String(a.pollId) === String(p._id));
      return { ...p, assignment: assign };
    });
    res.json(merged);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch assigned polls' });
  }
});
// Vote on active poll session
app.post("/api/polls/:id/vote", async (req, res) => {
  try {
    const pollId = req.params.id;
    const { optionIndex, userId } = req.body || {};
    const session = await PollSession.findOne({ pollId, active: true }).sort({ startedAt: -1 });
    if (!session) return res.status(400).json({ error: "No active poll session" });
    if (session.expiresAt && new Date() > session.expiresAt) {
      session.active = false;
      await session.save();
      return res.status(400).json({ error: "Poll session expired" });
    }
    // ensure optionIndex is valid for current question
    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex >= session.votes.length) {
      return res.status(400).json({ error: "Invalid optionIndex" });
    }
    // Prevent duplicate votes by same userId (optional)
    if (userId && session.voters && session.voters.includes(userId)) {
      return res.status(400).json({ error: "User already voted" });
    }

    session.votes[optionIndex] = (session.votes[optionIndex] || 0) + 1;
    if (userId) session.voters.push(userId);
    await session.save();
    res.json({ success: true, session });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to record vote" });
  }
});

// Get current session for a poll
app.get("/api/polls/:id/session", async (req, res) => {
  try {
    const pollId = req.params.id;
    // Get the most recent session (active or inactive) to show results
    const session = await PollSession.findOne({ pollId }).sort({ startedAt: -1 }).lean();
    if (!session) return res.json(null);
    const now = new Date();
    const timeLeft = session.expiresAt ? Math.max(0, new Date(session.expiresAt) - now) : null;
    res.json({ ...session, timeLeft });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch poll session" });
  }
});

// Advance to next question in active poll session
app.post('/api/polls/:id/next', authenticateJWT, async (req, res) => {
  try {
    if (!req.user || !['TEACHER', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    const pollId = req.params.id;
    const { timeLimitSeconds } = req.body || {};
    const poll = await Poll.findById(pollId).lean();
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    const session = await PollSession.findOne({ pollId, active: true }).sort({ startedAt: -1 });
    if (!session) return res.status(400).json({ error: 'No active session to advance' });

    const nextIndex = (session.currentQuestionIndex || 0) + 1;
    if (nextIndex >= (poll.questions || []).length) {
      // end session
      session.active = false;
      await session.save();
      return res.json({ message: 'Poll session ended' });
    }

    // reset votes for next question
    const nextOptions = (poll.questions || [])[nextIndex].options || [];
    session.currentQuestionIndex = nextIndex;
    session.votes = nextOptions.map(() => 0);
    session.voters = [];
    session.startedAt = new Date();
    session.expiresAt = timeLimitSeconds ? new Date(Date.now() + timeLimitSeconds * 1000) : null;
    await session.save();
    res.json(session);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to advance poll' });
  }
});

// Delete a poll
app.delete('/api/polls/:id', authenticateJWT, async (req, res) => {
  try {
    if (!req.user || !['TEACHER', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    const pollId = req.params.id;

    // Delete the poll
    const poll = await Poll.findByIdAndDelete(pollId);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    // Delete associated sessions
    await PollSession.deleteMany({ pollId });

    // Delete associated assignments
    await PollAssignment.deleteMany({ pollId });

    res.json({ message: 'Poll deleted successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

// Upload a resource file (admin)
app.post("/api/resources/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/${req.file.filename}`;
    const resource = await Resource.create({
      title: req.body.title || req.file.originalname,
      content: fileUrl,
      type: "file",
    });
    res.status(201).json(resource);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Download resource helper (if needed for non-static)
app.get("/api/resources/download/:filename", async (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.download(filePath);
});

// Upload for quiz generation - accepts txt, docx, xlsx, pptx (pptx stored only)
app.post(
  "/api/quizzes/generate-from-upload",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const ext = path.extname(req.file.originalname).toLowerCase();
      let extractedText = "";
      if (ext === ".txt") {
        extractedText = fs.readFileSync(req.file.path, "utf8");
      } else if (ext === ".docx") {
        const result = await mammoth.extractRawText({ path: req.file.path });
        extractedText = result.value || "";
      } else if (ext === ".xlsx") {
        const wb = XLSX.readFile(req.file.path);
        const sheets = wb.SheetNames;
        const parts = sheets.map((name) =>
          XLSX.utils.sheet_to_csv(wb.Sheets[name])
        );
        extractedText = parts.join("\n");
      } else if (ext === ".pptx") {
        const buffer = fs.readFileSync(req.file.path);
        const zip = await JSZip.loadAsync(buffer);
        const slideFiles = Object.keys(zip.files).filter(
          (name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
        );
        const parts = await Promise.all(
          slideFiles.map(async (name) => {
            const xml = await zip.files[name].async("string");
            const matches = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)];
            return matches.map((m) => m[1]).join(" ");
          })
        );
        extractedText = parts.join("\n\n");
      } else {
        return res.status(415).json({ error: "Unsupported file type" });
      }
      res.json({
        fileUrl: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        text: extractedText,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to process upload" });
    }
  }
);

app.post("/api/delete", async (req, res) => {
  const user = await User.findByIdAndDelete(req.body.userId);
  // console.log(user);
  const users = await User.find({}).lean();
  res.status(201).json(users);
});

app.post("/api/create-quiz", async (req, res) => {
  try {
    // console.log(req.body.assignment);

    const questionIds = await Promise.all(
      req.body.pool.map(async (individual) => {
        const question = await Question.create({
          questionText: encryptString(individual.questionText),
          options: (individual.options || []).map((ans) => encryptString(ans)),
          correctAnswerIndex: individual.correctAnswerIndex,
        });
        return question._id;
      })
    );

    const newQuiz = await Quiz.create({
      title: req.body.quiz.title,
      questionPool: questionIds,
      isPractice: req.body.quiz.isPractice || false,
    });

    const newAssignment = await QuizAssignment.create({
      quizId: newQuiz._id,
      studentIds: [...req.body.assignment.studentIds],
      deadline: req.body.assignment.deadline,
      timeLimit: req.body.assignment.timeLimit,
      isLive: req.body.assignment.isLive,
      numQuestionsToAssign: req.body.assignment.numQuestionsToAssign,
    });

    notifyNewAssignment(newAssignment);

    res.status(201).json({ quiz: newQuiz, assignment: newAssignment });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

app.post("/api/user/signup", async (req, res) => {
  const name = req.body.username;
  const password = req.body.password;

  if (!name || !password)
    return res.status(400).json({ error: "username and password required" });

  const exists = await User.findOne({ name });
  if (exists) {
    return res.status(409).json({ message: "User exists" });
  }

  const user = await User.create({
    name,
    role: "STUDENT",
    password,
  });
  res.status(200).json(user);
});

// --- Classrooms ---

// Create classroom (Teacher only)
app.post("/api/classrooms", authenticateJWT, async (req, res) => {
  try {
    if (req.user.role !== "TEACHER" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only teachers can create classrooms" });
    }
    const { name, description, studentIds } = req.body;
    if (!name) return res.status(400).json({ error: "Class name is required" });

    // Generate unique class code
    let classCode;
    let isUnique = false;
    while (!isUnique) {
      classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await Classroom.findOne({ classCode });
      if (!existing) isUnique = true;
    }

    const classroom = await Classroom.create({
      name,
      description,
      teacher: req.user.id,
      classCode,
      students: studentIds || [],
    });
    res.status(201).json(classroom);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create classroom" });
  }
});

// Join classroom (Student only)
app.post("/api/classrooms/join", authenticateJWT, async (req, res) => {
  try {
    const { classCode } = req.body;
    if (!classCode) return res.status(400).json({ error: "Class code is required" });

    const classroom = await Classroom.findOne({ classCode });
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    // Add student if not already in list
    if (!classroom.students.includes(req.user.id)) {
      classroom.students.push(req.user.id);
      await classroom.save();
    }
    res.json(classroom);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to join classroom" });
  }
});

// List classrooms
app.get("/api/classrooms", authenticateJWT, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "TEACHER") {
      query = { teacher: req.user.id };
    } else if (req.user.role === "STUDENT") {
      query = { students: req.user.id };
    }
    const classrooms = await Classroom.find(query).populate("teacher", "name").lean();
    res.json(classrooms);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch classrooms" });
  }
});

// Get classroom detail
app.get("/api/classrooms/:id", authenticateJWT, async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.id)
      .populate("teacher", "name")
      .populate("students", "name")
      .lean();
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });
    res.json(classroom);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch classroom" });
  }
});

// Upload resource for classroom
app.post("/api/classrooms/:id/resources", authenticateJWT, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "TEACHER" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only teachers can upload resources" });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileUrl = `/uploads/${req.file.filename}`;
    const resource = await Resource.create({
      title: req.body.title || req.file.originalname,
      content: fileUrl,
      type: "file",
      classroomId: req.params.id,
    });
    res.status(201).json(resource);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Get resources for classroom
app.get("/api/classrooms/:id/resources", authenticateJWT, async (req, res) => {
  try {
    const resources = await Resource.find({ classroomId: req.params.id }).lean();
    res.json(resources);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

// catch-all error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

server.listen(PORT, () => {
  console.log(`Listening on PORT: ${PORT}`);
});
