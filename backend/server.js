const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'quantum_compiler.db');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS user_code (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, language)
  );

  CREATE TABLE IF NOT EXISTS code_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    input TEXT,
    output TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_user_code ON user_code(email, language);
  CREATE INDEX IF NOT EXISTS idx_history_email ON code_history(email, created_at DESC);
`);

// Create temp directory for code execution
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Clean up old files periodically
setInterval(() => {
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > 300000) { // 5 minutes
      fs.unlinkSync(filePath);
    }
  });
}, 60000); // Run every minute

// Save user code to database
app.post('/api/code/save', (req, res) => {
  const { email, language, code } = req.body;

  if (!email || !language || !code) {
    return res.status(400).json({ error: 'Email, language, and code are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO user_code (email, language, code, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email, language) 
      DO UPDATE SET code = ?, updated_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(email, language, code, code);
    res.json({ success: true, message: 'Code saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save code: ' + error.message });
  }
});

// Get saved code for user and language
app.get('/api/code/:email/:language', (req, res) => {
  const { email, language } = req.params;

  try {
    const stmt = db.prepare('SELECT code FROM user_code WHERE email = ? AND language = ?');
    const result = stmt.get(email, language);
    
    if (result) {
      res.json({ code: result.code });
    } else {
      res.json({ code: null });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve code: ' + error.message });
  }
});

// Get history for a user
app.get('/api/history/:email', (req, res) => {
  const { email } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT id, language, code, input, output, created_at as timestamp
      FROM code_history 
      WHERE email = ? 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    
    const history = stmt.all(email);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve history: ' + error.message });
  }
});

// Save code to history after execution
app.post('/api/history/save', (req, res) => {
  const { email, language, code, input, output } = req.body;

  if (!email || !language || !code) {
    return res.status(400).json({ error: 'Email, language, and code are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO code_history (email, language, code, input, output, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(email, language, code, input || '', output || '');
    res.json({ success: true, message: 'History saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save history: ' + error.message });
  }
});

// Delete a history entry
app.delete('/api/history/:email/:id', (req, res) => {
  const { email, id } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM code_history WHERE email = ? AND id = ?');
    const result = stmt.run(email, id);
    
    if (result.changes > 0) {
      res.json({ success: true, message: 'History entry deleted' });
    } else {
      res.status(404).json({ error: 'History entry not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete history: ' + error.message });
  }
});

// Compile and execute code
app.post('/api/compile', async (req, res) => {
  const { code, language, input } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  const timestamp = Date.now();
  const uniqueId = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    let result;
    switch (language.toLowerCase()) {
      case 'cpp':
        result = await compileCpp(code, input, uniqueId);
        break;
      case 'python':
        result = await runPython(code, input, uniqueId);
        break;
      case 'java':
        result = await compileJava(code, input, uniqueId);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported language' });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// C++ compilation and execution
function compileCpp(code, input, uniqueId) {
  return new Promise((resolve, reject) => {
    const sourceFile = path.join(tempDir, `${uniqueId}.cpp`);
    const outputFile = path.join(tempDir, `${uniqueId}.out`);
    const inputFile = path.join(tempDir, `${uniqueId}.txt`);

    // Write source code
    fs.writeFileSync(sourceFile, code);

    // Write input if provided
    if (input) {
      fs.writeFileSync(inputFile, input);
    }

    // Compile
    exec(`g++ "${sourceFile}" -o "${outputFile}" 2>&1`, (compileError, compileStdout, compileStderr) => {
      if (compileError) {
        cleanup([sourceFile, outputFile, inputFile]);
        return resolve({ 
          success: false, 
          output: compileStdout || compileStderr,
          error: 'Compilation failed'
        });
      }

      // Execute
      const execCommand = input 
        ? `"${outputFile}" < "${inputFile}"`
        : `"${outputFile}"`;

      exec(execCommand, { timeout: 5000 }, (execError, execStdout, execStderr) => {
        cleanup([sourceFile, outputFile, inputFile]);

        if (execError && execError.killed) {
          return resolve({
            success: false,
            output: execStdout,
            error: 'Execution timeout (5 seconds exceeded)'
          });
        }

        if (execError) {
          return resolve({
            success: false,
            output: execStdout + '\n' + execStderr,
            error: 'Runtime error'
          });
        }

        resolve({
          success: true,
          output: execStdout || 'Program executed successfully with no output'
        });
      });
    });
  });
}

// Python execution
function runPython(code, input, uniqueId) {
  return new Promise((resolve, reject) => {
    const sourceFile = path.join(tempDir, `${uniqueId}.py`);
    const inputFile = path.join(tempDir, `${uniqueId}.txt`);

    // Write source code
    fs.writeFileSync(sourceFile, code);

    // Write input if provided
    if (input) {
      fs.writeFileSync(inputFile, input);
    }

    // Execute
    const execCommand = input
      ? `python3 "${sourceFile}" < "${inputFile}"`
      : `python3 "${sourceFile}"`;

    exec(execCommand, { timeout: 5000 }, (execError, execStdout, execStderr) => {
      cleanup([sourceFile, inputFile]);

      if (execError && execError.killed) {
        return resolve({
          success: false,
          output: execStdout,
          error: 'Execution timeout (5 seconds exceeded)'
        });
      }

      if (execError) {
        return resolve({
          success: false,
          output: execStderr || execStdout,
          error: 'Runtime error'
        });
      }

      resolve({
        success: true,
        output: execStdout || 'Program executed successfully with no output'
      });
    });
  });
}

// Java compilation and execution
function compileJava(code, input, uniqueId) {
  return new Promise((resolve, reject) => {
    // Extract class name from code
    const classNameMatch = code.match(/public\s+class\s+(\w+)/);
    if (!classNameMatch) {
      return resolve({
        success: false,
        error: 'Could not find public class declaration',
        output: 'Make sure your code contains: public class ClassName'
      });
    }

    const className = classNameMatch[1];
    const sourceFile = path.join(tempDir, `${className}.java`);
    const classFile = path.join(tempDir, `${className}.class`);
    const inputFile = path.join(tempDir, `${uniqueId}.txt`);

    // Write source code
    fs.writeFileSync(sourceFile, code);

    // Write input if provided
    if (input) {
      fs.writeFileSync(inputFile, input);
    }

    // Compile
    exec(`javac "${sourceFile}" 2>&1`, (compileError, compileStdout, compileStderr) => {
      if (compileError) {
        cleanup([sourceFile, classFile, inputFile]);
        return resolve({
          success: false,
          output: compileStdout || compileStderr,
          error: 'Compilation failed'
        });
      }

      // Execute
      const execCommand = input
        ? `java -cp "${tempDir}" ${className} < "${inputFile}"`
        : `java -cp "${tempDir}" ${className}`;

      exec(execCommand, { timeout: 5000 }, (execError, execStdout, execStderr) => {
        cleanup([sourceFile, classFile, inputFile]);

        if (execError && execError.killed) {
          return resolve({
            success: false,
            output: execStdout,
            error: 'Execution timeout (5 seconds exceeded)'
          });
        }

        if (execError) {
          return resolve({
            success: false,
            output: execStderr || execStdout,
            error: 'Runtime error'
          });
        }

        resolve({
          success: true,
          output: execStdout || 'Program executed successfully with no output'
        });
      });
    });
  });
}

// Cleanup helper
function cleanup(files) {
  files.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Code compiler server is running' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
