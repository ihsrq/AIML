require('dotenv').config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Use environment variables for sensitive data
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aimL@gmU';

// In-memory storage for faculty data (in production, use a database)
let facultyData = [];
let announcements = [];
let materials = [];

// Sample faculty data (in production, store hashed passwords)
const FACULTY_DATA_FILE = path.join(__dirname, "faculty.json");
const ANNOUNCEMENTS_FILE = path.join(__dirname, "announcements.json");
const MATERIALS_FILE = path.join(__dirname, "materials.json");

// Load data from files
function loadData() {
    try {
        if (fs.existsSync(FACULTY_DATA_FILE)) {
            facultyData = JSON.parse(fs.readFileSync(FACULTY_DATA_FILE, 'utf8'));
        } else {
            // Create default faculty accounts for each subject
            const defaultPassword = bcrypt.hashSync("111111", 10);
            
            // Get all subject HTML files
            const subjectFiles = fs.readdirSync(__dirname).filter(file => 
                file.endsWith('.html') && 
                !['index.html', 'login.html', 'admin.html', 'admin-login.html', 'faculty-login.html', 'faculty-dashboard.html'].includes(file)
            );

            // Create a faculty account for each subject
            facultyData = subjectFiles.map((file, index) => {
                const subjectCode = path.basename(file, '.html').toUpperCase();
                const facultyId = `faculty_${subjectCode}`;
                
                return {
                    id: facultyId,
                    name: `Faculty ${subjectCode}`,
                    email: `${facultyId}@example.com`,
                    password: defaultPassword,
                    subjects: [
                        { 
                            code: subjectCode, 
                            name: subjectCode // Using subject code as the name
                        }
                    ]
                };
            });
            
            saveFacultyData();
        }

        if (fs.existsSync(ANNOUNCEMENTS_FILE)) {
            announcements = JSON.parse(fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf8'));
        }

        if (fs.existsSync(MATERIALS_FILE)) {
            materials = JSON.parse(fs.readFileSync(MATERIALS_FILE, 'utf8'));
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

// Save data to files
function saveFacultyData() {
    fs.writeFileSync(FACULTY_DATA_FILE, JSON.stringify(facultyData, null, 2));
}

function saveAnnouncements() {
    fs.writeFileSync(ANNOUNCEMENTS_FILE, JSON.stringify(announcements, null, 2));
}

function saveMaterials() {
    fs.writeFileSync(MATERIALS_FILE, JSON.stringify(materials, null, 2));
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token is required' });
    }

    jwt.verify(token, JWT_SECRET, (err, faculty) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.faculty = faculty;
        next();
    });
}

// Initialize data
loadData();

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

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Security headers middleware
app.use((req, res, next) => {
  // Security headers for all responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files from root directory
app.use(express.static(__dirname));

// Serve static files from subjects directory
app.use('/subjects', express.static(path.join(__dirname, 'subjects')));

// Set cache control headers for specific file types
app.use((req, res, next) => {
  const url = req.originalUrl.toLowerCase();
  if (url.endsWith('.css') || url.endsWith('.js') || url.endsWith('.json')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
  next();
});

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

// Faculty authentication routes
app.post('/faculty/login', async (req, res) => {
    const { facultyId, password } = req.body;

    // Find faculty by ID or email
    const faculty = facultyData.find(f => f.id === facultyId || f.email === facultyId);
    if (!faculty) {
        return res.status(401).json({ message: 'Invalid faculty ID or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, faculty.password);
    if (!validPassword) {
        return res.status(401).json({ message: 'Invalid faculty ID or password' });
    }

    // Create and sign JWT token
    const token = jwt.sign(
        { id: faculty.id, name: faculty.name, email: faculty.email },
        JWT_SECRET,
        { expiresIn: '8h' }
    );

    res.json({ token });
});

// Faculty routes
app.get('/api/faculty/me', authenticateToken, (req, res) => {
    const faculty = facultyData.find(f => f.id === req.faculty.id);
    if (!faculty) {
        return res.status(404).json({ message: 'Faculty not found' });
    }
    
    // Don't send password hash
    const { password, ...facultyWithoutPassword } = faculty;
    res.json(facultyWithoutPassword);
});

// Announcement routes
app.get('/api/announcements', authenticateToken, (req, res) => {
    // Return announcements for the faculty's subjects
    const faculty = facultyData.find(f => f.id === req.faculty.id);
    if (!faculty) {
        return res.status(404).json({ message: 'Faculty not found' });
    }
    
    const facultySubjectCodes = faculty.subjects.map(s => s.code);
    const facultyAnnouncements = announcements.filter(a => 
        facultySubjectCodes.includes(a.subjectCode)
    );
    
    res.json(facultyAnnouncements);
});

app.post('/api/announcements', authenticateToken, (req, res) => {
    const { title, content, subjectCode } = req.body;
    
    if (!title || !content || !subjectCode) {
        return res.status(400).json({ message: 'Title, content, and subject code are required' });
    }
    
    // Verify faculty teaches this subject
    const faculty = facultyData.find(f => f.id === req.faculty.id);
    if (!faculty || !faculty.subjects.some(s => s.code === subjectCode)) {
        return res.status(403).json({ message: 'You are not authorized to post for this subject' });
    }
    
    const newAnnouncement = {
        _id: Date.now().toString(),
        title,
        content,
        subjectCode,
        facultyId: req.faculty.id,
        facultyName: faculty.name,
        date: new Date().toISOString()
    };
    
    announcements.unshift(newAnnouncement);
    saveAnnouncements();
    
    res.status(201).json(newAnnouncement);
});

app.delete('/api/announcements/:id', authenticateToken, (req, res) => {
    const announcementId = req.params.id;
    const announcementIndex = announcements.findIndex(a => a._id === announcementId);
    
    if (announcementIndex === -1) {
        return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Only allow the faculty who created the announcement to delete it
    if (announcements[announcementIndex].facultyId !== req.faculty.id) {
        return res.status(403).json({ message: 'You are not authorized to delete this announcement' });
    }
    
    announcements.splice(announcementIndex, 1);
    saveAnnouncements();
    
    res.json({ message: 'Announcement deleted successfully' });
});

// Material routes
app.get('/api/materials', authenticateToken, (req, res) => {
    // Return materials for the faculty's subjects
    const faculty = facultyData.find(f => f.id === req.faculty.id);
    if (!faculty) {
        return res.status(404).json({ message: 'Faculty not found' });
    }
    
    const facultySubjectCodes = faculty.subjects.map(s => s.code);
    const facultyMaterials = materials.filter(m => 
        facultySubjectCodes.includes(m.subjectCode)
    );
    
    res.json(facultyMaterials);
});

app.post('/api/materials', authenticateToken, (req, res) => {
    const { subjectCode, title, link, description } = req.body;
    
    if (!subjectCode || !title || !link) {
        return res.status(400).json({ message: 'Subject code, title, and link are required' });
    }
    
    // Verify faculty teaches this subject
    const faculty = facultyData.find(f => f.id === req.faculty.id);
    if (!faculty || !faculty.subjects.some(s => s.code === subjectCode)) {
        return res.status(403).json({ message: 'You are not authorized to add materials for this subject' });
    }
    
    const newMaterial = {
        _id: Date.now().toString(),
        subjectCode,
        title,
        link,
        description: description || '',
        facultyId: req.faculty.id,
        facultyName: faculty.name,
        date: new Date().toISOString()
    };
    
    materials.unshift(newMaterial);
    saveMaterials();
    
    res.status(201).json(newMaterial);
});

app.delete('/api/materials/:id', authenticateToken, (req, res) => {
    const materialId = req.params.id;
    const materialIndex = materials.findIndex(m => m._id === materialId);
    
    if (materialIndex === -1) {
        return res.status(404).json({ message: 'Material not found' });
    }
    
    // Only allow the faculty who added the material to delete it
    if (materials[materialIndex].facultyId !== req.faculty.id) {
        return res.status(403).json({ message: 'You are not authorized to delete this material' });
    }
    
    materials.splice(materialIndex, 1);
    saveMaterials();
    
    res.json({ message: 'Material deleted successfully' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Faculty login: http://localhost:${PORT}/faculty-login.html`);
});
