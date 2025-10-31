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

const aes256 = require("aes256");
const { encryptString, decryptString } = require("./utils/crypto");

const encryptKey = process.env.ENCRYPT_KEY || "my passphrase";

const app = express();
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
  const discussion = DiscussionPost.create({
    title: req.body.title,
    content: req.body.content,
    authorId: req.body.authorId,
  });

  res.json(discussion);
});

app.post("/api/discussions/reply", async (req, res) => {
  try {
    const { postId, authorId, content } = req.body.optimistic;

    // Create the reply
    const createReply = await DiscussionReply.create({
      authorId,
      content,
    });

    // Find the main post and push the reply ID
    const mainPost = await DiscussionPost.findById(postId);
    if (!mainPost) {
      return res.status(404).json({ error: "Discussion post not found" });
    }

    mainPost.replies.push(createReply._id);
    await mainPost.save();

    console.log(createReply, "\n\n\n", mainPost);

    res.json({ message: "Reply added to discussion post", reply: createReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/api/assignment/:id", async (req, res) => {
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
    })),
  }));
  res.json(decrypted);
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
          options: (q.options || []).map((opt) => encryptString(opt)),
          correctAnswerIndex: q.correctAnswerIndex,
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
      })),
    }));
    res.json(decrypted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load quizzes" });
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
        // Not parsed; keep for resources and future parsing
        extractedText = "";
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
  console.log(user);
  const users = await User.find({}).lean();
  res.status(201).json(users);
});

app.post("/api/create-quiz", async (req, res) => {
  try {
    console.log(req.body.assignment);

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

// catch-all error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Listening on PORT: ${PORT}`);
});
