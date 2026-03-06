# Quantum Compiler - Professional Online IDE

A modern, full-stack web-based code compiler that supports **C++**, **Python**, and **Java**. Write, compile, and execute code directly in your browser with a professional interface, automatic code persistence, and comprehensive history tracking.

![Code Compiler](https://img.shields.io/badge/React-18.2-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![Monaco Editor](https://img.shields.io/badge/Monaco-Editor-orange)

## Features

### Core Features
- **Multi-Language Support**: C++, Python, and Java with elegant button selection
- **Professional Dark Theme**: Stunning gradient toolbar with glowing title
- **Fast Execution**: Quick compilation and runtime with visual feedback
- **Monaco Editor**: Industry-standard code editor with syntax highlighting (minimap disabled for cleaner UI)
- **Real-time Output**: See results instantly with color-coded error messages
- **Custom Input**: Provide stdin input for your programs
- **Error Handling**: Clear compilation and runtime error messages
- **Responsive Design**: Works on desktop and mobile devices

### Advanced Features
- **Resizable 3-Pane Layout**: CodeChef-style layout with code editor on left, input/output stacked on right
- **Hidden Gutters**: Professional UI with split panes that glow blue on hover
- **Auto-Save**: Automatic code persistence with SQLite database per user email
- **User Authentication**: Login system with profile menu, account switching, and logout
- **Session Persistence**: Login state cached using localStorage for seamless reloads
- **Code History**: Complete history of executed code with input/output saved
- **History Management**: View and delete previous code executions with thread-like block layout
- **Play Button Icon**: Animated play icon on the green Run button
- **Glowing Logo & Title**: Stylish Orbitron font with animated glow effects
- **Language Buttons**: Beautiful animated language selection with hover effects

## Architecture

```
quantum/
├── frontend/          # React frontend application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Toolbar.js         # Main toolbar with logo and controls
│   │   │   ├── Toolbar.css        # Stylish toolbar styling with animations
│   │   │   ├── History.js         # Code history viewer and manager
│   │   │   └── History.css        # Professional history modal styling
│   │   ├── logoquantum.png        # Quantum logo with glow effect
│   │   ├── App.js                 # Main application component
│   │   ├── App.css                # Application styling
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
│
├── backend/           # Node.js/Express backend
│   ├── server.js      # API server with history endpoints
│   ├── temp/          # Temporary compilation files
│   ├── quantum_compiler.db       # SQLite database (persistent storage)
│   └── package.json
│
├── setup.sh           # Automated setup script
├── start.sh           # Start both servers
└── README.md
```

## Database Structure

### SQLite Database Schema

**user_code table** - Stores the latest code for each user/language
```sql
- id: INTEGER PRIMARY KEY
- email: TEXT (user identifier)
- language: TEXT (cpp/python/java)
- code: TEXT (source code)
- updated_at: DATETIME
- UNIQUE(email, language)
```

**code_history table** - Stores execution history with input/output
```sql
- id: INTEGER PRIMARY KEY
- email: TEXT (user identifier)
- language: TEXT (cpp/python/java)
- code: TEXT (source code)
- input: TEXT (stdin provided)
- output: TEXT (execution result)
- created_at: DATETIME
```

## UI Highlights

### Glowing Title & Logo
- **Orbitron Font**: Futuristic, bold typography for "Quantum Compiler"
- **Animated Gradient**: Cyan to blue gradient that shifts and glows
- **Logo Animation**: Quantum logo with pulsing drop-shadow effect

### Language Selection
- **Button-Based Interface**: Beautiful animated buttons for C++, Python, and Java
- **Hover Effects**: Smooth transitions with shimmer animation
- **Active State**: Gradient background for selected language

### Run Button
- **Play Icon**: Animated SVG play icon with pulse effect
- **Green Gradient**: Eye-catching gradient from #00c853 to #00a843
- **Shimmer Effect**: Light sweep animation on hover

### 3-Pane Layout (CodeChef Style)
```
┌─────────────────┬──────────────┐
│                 │   Input      │
│   Code Editor   ├──────────────┤
│                 │   Output     │
└─────────────────┴──────────────┘
```

### Hidden Gutters
- Invisible by default for clean appearance
- Blue glow (#007acc) appears on hover
- Smooth transitions for professional feel
- Drag the horizontal divider to adjust editor height
- Drag the vertical divider to adjust input/output panel widths
- Layout preferences persist during your session

### Professional Design
- Clean, minimalist interface without distracting icons
- Blue color scheme for all interactive elements
- Settings icon for future configuration options
- Dropdown language selector for cleaner UI

### Database Integration
- SQLite database with better-sqlite3 driver
- Persistent storage for user code and execution history
- Automatic database initialization on first run
- Efficient queries with indexed columns

## Prerequisites

Before running this application, ensure you have the following installed:

### Required Software

1. **Node.js** (v14 or higher) and **npm**
   - Download from: https://nodejs.org/

2. **Compilers**:
   - **g++** (for C++)
     ```bash
     # Ubuntu/Debian
     sudo apt-get install g++
     
     # macOS (using Homebrew)
     brew install gcc
     ```
   
   - **Python 3**
     ```bash
     # Ubuntu/Debian
     sudo apt-get install python3
     
     # macOS (usually pre-installed)
     python3 --version
     ```
   
   - **Java JDK** (for Java)
     ```bash
     # Ubuntu/Debian
     sudo apt-get install default-jdk
     
     # macOS (using Homebrew)
     brew install openjdk
     ```

### Verify Installation

```bash
# Check Node.js
node --version

# Check npm
npm --version

# Check compilers
g++ --version
python3 --version
javac --version
java --version
```

## Installation & Setup

### Quick Setup (Recommended)

```bash
cd /home/ravi/quantum
./setup.sh
```

### Manual Setup

### 1. Clone or Navigate to the Project

```bash
cd /home/ravi/quantum
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## Running the Application

You need to run both the backend and frontend servers.

### Terminal 1: Start Backend Server

```bash
cd backend
npm start
```

The backend server will start on `http://localhost:5000`

### Terminal 2: Start Frontend Development Server

```bash
cd frontend
npm start
```

The frontend will automatically open in your browser at `http://localhost:3000`

## Usage

1. **Enter Email**: On first launch, enter your email to enable code auto-save
2. **Select Language**: Choose between C++, Python, or Java from the button options
3. **Write Code**: Use the Monaco editor to write your program
4. **Resize Panels**: Drag the dividers to adjust editor, input, and output panel sizes
5. **Add Input** (optional): Enter stdin input in the Input panel
6. **Run**: Click the "Run" button to compile and execute
7. **View Output**: See the results in the Output panel
8. **Access History**: Click profile menu to view code execution history
### Code Persistence

- Your code is **automatically saved** every 2 seconds as you type
- Code is saved to SQLite database per email address and language
- Login session persists across page reloads using localStorage
- When you return, your code and session will be automatically restored
- Switch between languages without losing your work
- Use logout to clear session and switch to a different user account
- When you return, your code will be automatically loaded
- Switch between languages without losing your work

### Example Programs

#### C++
```cpp
#include <iostream>
using namespace std;

int main() {
    string name;
    cout << "Enter your name: ";
    cin >> name;
    cout << "Hello, " << name << "!" << endl;
    return 0;
}
```

#### Python
```python
name = input("Enter your name: ")
print(f"Hello, {name}!")
```

#### Java
```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Enter your name: ");
        String name = sc.nextLine();
        System.out.println("Hello, " + name + "!");
## API Endpoints
}
```

## 🛠️ API Endpoints

### POST `/api/compile`

Compiles and executes code.

**Request Body:**
```json
{
  "code": "string",
  "language": "cpp" | "python" | "java",
  "input": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "output": "program output"
}
```

### POST `/api/code/save`

Saves user code to database.

**Request Body:**
```json
{
  "email": "user@example.com",
  "language": "cpp" | "python" | "java",
  "code": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Code saved successfully"
}
```

### GET `/api/code/:email/:language`

Retrieves saved code for a user and language.

**Response:**
```json
{
  "code": "saved code string or null"
}
```

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "OK",
## Customizationcompiler server is running"
}
```

## 🎨 Customization

### Change Backend Port

Edit `backend/server.js`:
```javascript
const PORT = 5000; // Change to your desired port
```

Also update `frontend/src/App.js`:
```javascript
const BACKEND_URL = 'http://localhost:5000'; // Update port here too
```

### Modify Execution Timeout

Edit `backend/server.js` and change the timeout value:
```javascript
exec(command, { timeout: 5000 }, ...); // 5000ms = 5 seconds
```

## Security Notes

**Important**: This application executes arbitrary code on the server. For production use:

1. Implement user authentication
2. Add rate limiting
3. Use containerization (Docker) for isolation
4. Implement resource limits (CPU, memory)
5. Add input sanitization
6. Use a sandboxed execution environment

## Building for Production

### Build Frontend

```bash
cd frontend
npm run build
```

This creates an optimized production build in `frontend/build/`.

## Deployment

This application requires **split deployment** because Vercel doesn't support code execution with system compilers.

### Recommended: Frontend on Vercel + Backend on Railway

#### Step 1: Deploy Backend to Railway

```bash
npm install -g @railway/cli
railway login
cd backend
railway init
railway up
railway domain  # Note your backend URL
```

#### Step 2: Update Frontend Configuration

Edit `frontend/src/App.js`:
```javascript
const BACKEND_URL = 'https://your-app.railway.app'; // Replace with your Railway URL
```

#### Step 3: Deploy Frontend to Vercel

```bash
npm install -g vercel
cd /home/ravi/quantum
vercel --prod
```

### Alternative Options

- **Render**: Free tier with auto-sleep (good for testing)
- **Heroku**: Reliable but paid
- **DigitalOcean**: App Platform or Droplet
- **Railway**: Full-stack deployment (both frontend + backend)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions and all deployment options.

## Troubleshooting

### Backend connection error
- Ensure backend is running on port 5000
- Check if firewall is blocking the port
- Verify CORS is enabled in backend

### Compilation errors
- Verify compilers are installed: `g++`, `python3`, `javac`
- Check compiler paths are in system PATH
- Ensure temp directory has write permissions

### Monaco Editor not loading
- Check internet connection (CDN required)
- Clear browser cache
- Verify React is properly installed

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## License

This project is open source and available under the MIT License.

## Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [React](https://reactjs.org/) - Frontend framework
- [Express](https://expressjs.com/) - Backend framework

---

Built with React, Node.js, and SQLite

## Changelog

### v2.1 - Enhanced Authentication & Deployment
- Added logout functionality with clear session management
- Implemented localStorage-based session persistence
- Login state now survives page reloads
- Thread-like block layout for code history display
- Improved save status indicator with animations
- Added Vercel and Railway deployment configuration
- Created comprehensive deployment documentation

### v2.0 - Professional Edition
- Added resizable split-pane layout
- Implemented SQLite database for code persistence
- Auto-save functionality (2-second debounce)
- User email-based code storage
- Changed to professional blue color scheme
- Removed decorative emojis for cleaner UI
- Redesigned toolbar with language buttons
- Renamed to "Quantum Compiler"

### v1.0 - Initial Release
- Multi-language support (C++, Python, Java)
- Monaco Editor integration
- Code compilation and execution
- Error handling
