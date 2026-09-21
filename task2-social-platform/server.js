require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  bio: { type: String, default: "Building, learning and sharing." },
  avatar: { type: String, default: "" },
  location: { type: String, default: "Pakistan" },
  website: { type: String, default: "" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true, maxlength: 1000 },
  image: { type: String, default: "" },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true, maxlength: 500 }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);
const Comment = mongoose.model("Comment", commentSchema);

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar,
    location: user.location,
    website: user.website,
    followers: user.followers?.length || 0,
    following: user.following?.length || 0
  };
}

function signToken(user) {
  return jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: "7d" });
}

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authentication required." });
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found." });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session." });
  }
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "Name, username, email and password are required." });
    }
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (exists) return res.status(409).json({ message: "Email or username already exists." });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, username, email, password: hashed });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (e) {
    res.status(500).json({ message: "Could not create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch {
    res.status(500).json({ message: "Login failed." });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get("/api/users", auth, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).sort({ createdAt: -1 }).limit(30);
  res.json({ users: users.map(publicUser) });
});

app.get("/api/users/:username", auth, async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!user) return res.status(404).json({ message: "User not found." });
  const posts = await Post.find({ author: user._id }).populate("author", "name username avatar").sort({ createdAt: -1 });
  res.json({
    user: publicUser(user),
    posts: posts.map(p => ({
      id: p._id, content: p.content, image: p.image, createdAt: p.createdAt,
      likes: p.likes.length, liked: p.likes.some(id => id.equals(req.user._id)),
      author: publicUser(p.author)
    }))
  });
});

app.patch("/api/users/me", auth, async (req, res) => {
  const allowed = ["name", "bio", "avatar", "location", "website"];
  allowed.forEach(key => {
    if (req.body[key] !== undefined) req.user[key] = String(req.body[key]).trim();
  });
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

app.post("/api/users/:id/follow", auth, async (req, res) => {
  if (String(req.user._id) === String(req.params.id)) return res.status(400).json({ message: "You cannot follow yourself." });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: "User not found." });

  const already = req.user.following.some(id => id.equals(target._id));
  if (already) {
    req.user.following.pull(target._id);
    target.followers.pull(req.user._id);
  } else {
    req.user.following.addToSet(target._id);
    target.followers.addToSet(req.user._id);
  }
  await Promise.all([req.user.save(), target.save()]);
  res.json({ following: !already, followers: target.followers.length });
});

app.get("/api/posts", auth, async (req, res) => {
  const posts = await Post.find().populate("author").sort({ createdAt: -1 }).limit(60);
  const comments = await Comment.find({ post: { $in: posts.map(p => p._id) } }).populate("author", "name username avatar").sort({ createdAt: 1 });
  const commentMap = {};
  comments.forEach(c => {
    const key = c.post.toString();
    commentMap[key] ||= [];
    commentMap[key].push({ id: c._id, content: c.content, createdAt: c.createdAt, author: publicUser(c.author) });
  });

  res.json({
    posts: posts.map(p => ({
      id: p._id,
      content: p.content,
      image: p.image,
      createdAt: p.createdAt,
      likes: p.likes.length,
      liked: p.likes.some(id => id.equals(req.user._id)),
      comments: commentMap[p._id.toString()] || [],
      author: publicUser(p.author)
    }))
  });
});

app.post("/api/posts", auth, async (req, res) => {
  const { content, image = "" } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ message: "Post content is required." });
  const post = await Post.create({ author: req.user._id, content: content.trim(), image: image.trim() });
  await post.populate("author");
  res.status(201).json({
    post: {
      id: post._id, content: post.content, image: post.image, createdAt: post.createdAt,
      likes: 0, liked: false, comments: [], author: publicUser(post.author)
    }
  });
});

app.delete("/api/posts/:id", auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found." });
  if (!post.author.equals(req.user._id)) return res.status(403).json({ message: "You can only delete your own posts." });
  await Promise.all([post.deleteOne(), Comment.deleteMany({ post: post._id })]);
  res.json({ message: "Post deleted." });
});

app.post("/api/posts/:id/like", auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found." });
  const liked = post.likes.some(id => id.equals(req.user._id));
  liked ? post.likes.pull(req.user._id) : post.likes.addToSet(req.user._id);
  await post.save();
  res.json({ liked: !liked, likes: post.likes.length });
});

app.post("/api/posts/:id/comments", auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found." });
  if (!req.body.content?.trim()) return res.status(400).json({ message: "Comment cannot be empty." });
  const comment = await Comment.create({ post: post._id, author: req.user._id, content: req.body.content.trim() });
  await comment.populate("author", "name username avatar");
  res.status(201).json({
    comment: { id: comment._id, content: comment.content, createdAt: comment.createdAt, author: publicUser(comment.author) }
  });
});

app.get("/api/stats", auth, async (req, res) => {
  const [users, posts, comments] = await Promise.all([User.countDocuments(), Post.countDocuments(), Comment.countDocuments()]);
  res.json({ users, posts, comments });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pulse_social");
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Pulse Social running at http://localhost:${PORT}`));
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}
start();
