const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const ADMIN_PASSWORD = "aimL@gmU";

// TODO: add all your real students here
// key = student ID, password = their password, yearPage = which page to go to after login
const DATA_FILE = path.join(__dirname, "students.json");

function loadStudents() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load students.json", err);
    return {};
  }
}

function requireAdmin(req, res, next) {
  const key = req.header("x-admin-key");
  if (key !== ADMIN_PASSWORD) {
    return res.status(403).json({ message: "Admin authentication failed" });
  }
  next();
}

let students = loadStudents();

function saveStudents() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(students, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save students.json", err);
  }
}

// Serve all static files (HTML, CSS, JS, images) from this folder
app.use(express.static(__dirname));

// Parse form and JSON data from POST/PUT requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/login", (req, res) => {
  const { studentId, password } = req.body;

  // Admin login via the same form
  if (studentId === "AiMl" && password === ADMIN_PASSWORD) {
    return res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Admin Redirect</title></head>
<body>
<script>
  // Store admin key for admin.html to use
  sessionStorage.setItem('adminKey', ${JSON.stringify(ADMIN_PASSWORD)});
  window.location.href = '/admin.html';
</script>
</body></html>`);
  }

  const student = students[studentId];

  if (!student || student.password !== password) {
    return res.status(401).send("Invalid ID or password");
  }

  return res.redirect(student.yearPage);
});

app.post("/change-password", (req, res) => {
  const { studentId, oldPassword, newPassword } = req.body;

  if (!studentId || !oldPassword || !newPassword) {
    return res.status(400).send("All fields are required.");
  }

  const student = students[studentId];

  if (!student) {
    return res.status(404).send("Student ID not found.");
  }

  if (student.password !== oldPassword) {
    return res.status(401).send("Current password is incorrect.");
  }

  student.password = newPassword;
  saveStudents();

  return res.send("Password updated successfully. You can now log in with your new password.");
});

// --- Admin APIs for managing students.json ---

// Get all students as an array
app.get("/api/students", requireAdmin, (req, res) => {
  const list = Object.entries(students).map(([id, data]) => ({
    id,
    password: data.password,
    yearPage: data.yearPage,
  }));
  res.json(list);
});

// Add a new student
app.post("/api/students", requireAdmin, (req, res) => {
  const { id, password, yearPage } = req.body;

  if (!id || !password || !yearPage) {
    return res.status(400).json({ message: "id, password, and yearPage are required" });
  }

  if (students[id]) {
    return res.status(409).json({ message: "Student with this ID already exists" });
  }

  students[id] = { password, yearPage };
  saveStudents();

  return res.status(201).json({ message: "Student added" });
});

// Update an existing student
app.put("/api/students/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { password, yearPage } = req.body;

  const student = students[id];
  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  if (password) {
    student.password = password;
  }
  if (yearPage) {
    student.yearPage = yearPage;
  }

  saveStudents();
  return res.json({ message: "Student updated" });
});

// Delete a student
app.delete("/api/students/:id", requireAdmin, (req, res) => {
  const { id } = req.params;

  if (!students[id]) {
    return res.status(404).json({ message: "Student not found" });
  }

  delete students[id];
  saveStudents();

  return res.json({ message: "Student deleted" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
