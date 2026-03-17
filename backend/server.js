const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

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

  CREATE TABLE IF NOT EXISTS project_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    filename TEXT NOT NULL,
    language TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, filename)
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_user_code ON user_code(email, language);
  CREATE INDEX IF NOT EXISTS idx_history_email ON code_history(email, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_project_files_email ON project_files(email, updated_at DESC);
`);

// Create temp directory for code execution
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const cacheDir = path.join(__dirname, 'cache');
const cppCacheDir = path.join(cacheDir, 'cpp');
const javaCacheDir = path.join(cacheDir, 'java');
for (const dir of [cacheDir, cppCacheDir, javaCacheDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const isWindows = process.platform === 'win32';
const CPP_EXEC_EXT = isWindows ? '.exe' : '.out';
const PYTHON_CMD = isWindows ? 'python' : 'python3';

function shortHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function runProcess(command, args, options = {}) {
  const {
    cwd,
    input,
    timeoutMs = 5000
  } = options;

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        code: -1,
        stdout,
        stderr: stderr || error.message,
        timedOut: false,
        spawnError: true
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        code,
        stdout,
        stderr,
        timedOut,
        spawnError: false
      });
    });

    if (typeof input === 'string' && input.length > 0) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

// Helper function to hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Register endpoint
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  if (password.length < 4) {
    return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
  }

  try {
    const hashedPassword = hashPassword(password);
    const stmt = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
    stmt.run(email, hashedPassword);
    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      res.status(409).json({ success: false, message: 'Email already registered' });
    } else {
      res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
    }
  }
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const hashedPassword = hashPassword(password);
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?');
    const user = stmt.get(email, hashedPassword);

    if (user) {
      res.json({ success: true, message: 'Login successful', email: user.email });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed: ' + error.message });
  }
});

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

// Evict stale compile cache artifacts to control disk usage.
setInterval(() => {
  const now = Date.now();
  const maxAgeMs = 60 * 60 * 1000; // 1 hour

  for (const dir of [cppCacheDir, javaCacheDir]) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const entryPath = path.join(dir, entry);
      try {
        const stats = fs.statSync(entryPath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.rmSync(entryPath, { recursive: true, force: true });
        }
      } catch (err) {
        // Ignore cache cleanup errors.
      }
    }
  }
}, 5 * 60 * 1000);

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

// List project files for a user
app.get('/api/project-files/:email', (req, res) => {
  const { email } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT filename as name, language, content, updated_at
      FROM project_files
      WHERE email = ?
      ORDER BY updated_at DESC, id DESC
    `);
    const files = stmt.all(email);
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve project files: ' + error.message });
  }
});

// Save or update one project file for a user
app.post('/api/project-files/save', (req, res) => {
  const { email, name, language, content } = req.body;

  if (!email || !name || !language || typeof content !== 'string') {
    return res.status(400).json({ error: 'Email, name, language, and content are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO project_files (email, filename, language, content, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email, filename)
      DO UPDATE SET
        language = excluded.language,
        content = excluded.content,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(email, name, language, content);
    res.json({ success: true, message: 'Project file saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save project file: ' + error.message });
  }
});

// Delete one project file for a user
app.delete('/api/project-files/:email/:filename', (req, res) => {
  const { email, filename } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM project_files WHERE email = ? AND filename = ?');
    const result = stmt.run(email, filename);

    if (result.changes > 0) {
      res.json({ success: true, message: 'Project file deleted' });
    } else {
      res.status(404).json({ error: 'Project file not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project file: ' + error.message });
  }
});

// Delete all project files for a user
app.delete('/api/project-files/:email', (req, res) => {
  const { email } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM project_files WHERE email = ?');
    const result = stmt.run(email);
    res.json({ success: true, deletedCount: result.changes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear project files: ' + error.message });
  }
});

// Compile and execute code
app.post('/api/compile', async (req, res) => {
  const { code, language, input } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  try {
    let result;
    switch (language.toLowerCase()) {
      case 'cpp':
        result = await compileCpp(code, input);
        break;
      case 'python':
        result = await runPython(code, input);
        break;
      case 'java':
        result = await compileJava(code, input);
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
async function compileCpp(code, input) {
  const codeHash = shortHash(code);
  const sourceFile = path.join(cppCacheDir, `${codeHash}.cpp`);
  const outputFile = path.join(cppCacheDir, `${codeHash}${CPP_EXEC_EXT}`);

  if (!fs.existsSync(outputFile)) {
    fs.writeFileSync(sourceFile, code);
    const compileResult = await runProcess('g++', [sourceFile, '-O0', '-o', outputFile], {
      timeoutMs: 15000
    });

    if (compileResult.timedOut) {
      cleanup([sourceFile, outputFile]);
      return {
        success: false,
        output: compileResult.stdout,
        error: 'Compilation timeout (15 seconds exceeded)'
      };
    }

    if (compileResult.spawnError || compileResult.code !== 0) {
      cleanup([sourceFile, outputFile]);
      return {
        success: false,
        output: compileResult.stdout || compileResult.stderr,
        error: 'Compilation failed'
      };
    }
  }

  const execResult = await runProcess(outputFile, [], {
    input,
    timeoutMs: 5000
  });

  if (execResult.timedOut) {
    return {
      success: false,
      output: execResult.stdout,
      error: 'Execution timeout (5 seconds exceeded)'
    };
  }

  if (execResult.spawnError || execResult.code !== 0) {
    return {
      success: false,
      output: `${execResult.stdout}${execResult.stderr ? `\n${execResult.stderr}` : ''}`.trim(),
      error: 'Runtime error'
    };
  }

  return {
    success: true,
    output: execResult.stdout || 'Program executed successfully with no output'
  };
}

// Python execution
async function runPython(code, input) {
  const execResult = await runProcess(PYTHON_CMD, ['-c', code], {
    input,
    timeoutMs: 5000
  });

  if (execResult.timedOut) {
    return {
      success: false,
      output: execResult.stdout,
      error: 'Execution timeout (5 seconds exceeded)'
    };
  }

  if (execResult.spawnError || execResult.code !== 0) {
    return {
      success: false,
      output: execResult.stderr || execResult.stdout,
      error: 'Runtime error'
    };
  }

  return {
    success: true,
    output: execResult.stdout || 'Program executed successfully with no output'
  };
}

// Java compilation and execution
async function compileJava(code, input) {
  const classNameMatch = code.match(/public\s+class\s+(\w+)/);
  if (!classNameMatch) {
    return {
      success: false,
      error: 'Could not find public class declaration',
      output: 'Make sure your code contains: public class ClassName'
    };
  }

  const className = classNameMatch[1];
  const codeHash = shortHash(code);
  const classDir = path.join(javaCacheDir, `${codeHash}_${className}`);
  const sourceFile = path.join(classDir, `${className}.java`);
  const classFile = path.join(classDir, `${className}.class`);

  if (!fs.existsSync(classDir)) {
    fs.mkdirSync(classDir, { recursive: true });
  }

  if (!fs.existsSync(classFile)) {
    fs.writeFileSync(sourceFile, code);
    const compileResult = await runProcess('javac', [sourceFile], {
      timeoutMs: 15000
    });

    if (compileResult.timedOut) {
      cleanup([classDir]);
      return {
        success: false,
        output: compileResult.stdout,
        error: 'Compilation timeout (15 seconds exceeded)'
      };
    }

    if (compileResult.spawnError || compileResult.code !== 0) {
      cleanup([classDir]);
      return {
        success: false,
        output: compileResult.stdout || compileResult.stderr,
        error: 'Compilation failed'
      };
    }
  }

  const execResult = await runProcess('java', ['-cp', classDir, className], {
    input,
    timeoutMs: 5000
  });

  if (execResult.timedOut) {
    return {
      success: false,
      output: execResult.stdout,
      error: 'Execution timeout (5 seconds exceeded)'
    };
  }

  if (execResult.spawnError || execResult.code !== 0) {
    return {
      success: false,
      output: execResult.stderr || execResult.stdout,
      error: 'Runtime error'
    };
  }

  return {
    success: true,
    output: execResult.stdout || 'Program executed successfully with no output'
  };
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
