// map-scores.js
const fs = require('fs');
const path = require('path');

// Function to read JSON file
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return {};
  }
}

// Function to write JSON file
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Successfully updated ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error writing ${filePath}:`, error);
    return false;
  }
}

// Main function to map students to scores
function mapStudentsToScores() {
  const studentsPath = path.join(__dirname, 'students.json');
  const scoresPath = path.join(__dirname, 'scores.json');
  
  console.log('📂 Reading student and score data...');
  const students = readJsonFile(studentsPath);
  const scores = readJsonFile(scoresPath) || {};
  
  let changesMade = false;
  
  console.log('🔄 Mapping students to scores...');
  Object.entries(students).forEach(([studentId, studentData]) => {
    if (!scores[studentId]) {
      const semesterMatch = studentData.yearPage.match(/\/(year\d+-sem\d+)/);
      if (!semesterMatch) {
        console.warn(`⚠️  Could not determine semester for ${studentId} from ${studentData.yearPage}`);
        return;
      }
      
      const semester = semesterMatch[1];
      
      scores[studentId] = {
        [semester]: {
          "U25CS1101": { "score": 0, "max_score": 100, "grade": "N/A" },
          "U25CS1102": { "score": 0, "max_score": 100, "grade": "N/A" },
          "U25CS1103": { "score": 0, "max_score": 100, "grade": "N/A" },
          "U25CS1104": { "score": 0, "max_score": 100, "grade": "N/A" },
          "U25CS1105": { "score": 0, "max_score": 100, "grade": "N/A" }
        }
      };
      
      console.log(`✅ Added default scores for ${studentId} in ${semester}`);
      changesMade = true;
    } else {
      console.log(`ℹ️  Student ${studentId} already has scores.`);
    }
  });
  
  if (changesMade) {
    const success = writeJsonFile(scoresPath, scores);
    if (success) {
      console.log('🎉 Successfully updated all student scores!');
    } else {
      console.error('❌ Failed to update scores file.');
    }
  } else {
    console.log('ℹ️  No changes needed - all students already have score entries.');
  }
}

// Run the mapping
mapStudentsToScores();
