import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import Split from 'react-split';
import Toolbar from './components/Toolbar';
import History from './components/History';
import './App.css';

const BACKEND_URL = 'https://quantum-production-4564.up.railway.app';

const defaultCode = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, C++!" << endl;
    return 0;
}`,
  python: `print("Hello, Python!")`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}`
};

function App() {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(defaultCode.cpp);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', ''

  // Restore login session from localStorage on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    const savedIsLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (savedEmail && savedIsLoggedIn === 'true') {
      setUserEmail(savedEmail);
      setIsLoggedIn(true);
    }
  }, []);

  const loadSavedCode = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/code/${userEmail}/${language}`);
      if (response.data.code) {
        setCode(response.data.code);
      } else {
        setCode(defaultCode[language]);
      }
    } catch (err) {
      console.error('Failed to load code:', err);
      setCode(defaultCode[language]);
    }
  };

  const saveCode = async () => {
    try {
      setSaveStatus('saving');
      await axios.post(`${BACKEND_URL}/api/code/save`, {
        email: userEmail,
        language,
        code
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error('Failed to save code:', err);
      setSaveStatus('');
    }
  };

  // Load saved code on mount and language change
  useEffect(() => {
    if (isLoggedIn && userEmail) {
      loadSavedCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, userEmail, isLoggedIn]);

  // Auto-save code when it changes
  useEffect(() => {
    if (isLoggedIn && userEmail && code) {
      const timer = setTimeout(() => {
        saveCode();
      }, 2000); // Debounce save by 2 seconds
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, userEmail, isLoggedIn]);

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleLoginSubmit = () => {
    if (userEmail.trim()) {
      setIsLoggedIn(true);
      setShowLoginModal(false);
      // Save login state to localStorage
      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('isLoggedIn', 'true');
      loadSavedCode();
    }
  };

  const handleSwitchAccount = () => {
    setUserEmail('');
    setIsLoggedIn(false);
    setCode(defaultCode[language]);
    // Clear localStorage
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isLoggedIn');
    setShowLoginModal(true);
  };

  const handleLogout = () => {
    setUserEmail('');
    setIsLoggedIn(false);
    setCode(defaultCode[language]);
    setInput('');
    setOutput('');
    setError('');
    // Clear localStorage
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isLoggedIn');
  };

  const handleShowHistory = () => {
    setShowHistory(true);
  };

  const handleLoadFromHistory = (historyItem) => {
    setLanguage(historyItem.language);
    setCode(historyItem.code);
    setInput(historyItem.input || '');
    setOutput(historyItem.output || '');
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setOutput('');
    setError('');
    // If not logged in, switch to default code for the language
    if (!isLoggedIn) {
      setCode(defaultCode[newLanguage]);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setError('');

    try {
      const response = await axios.post(`${BACKEND_URL}/api/compile`, {
        code,
        language,
        input
      });

      if (response.data.success) {
        setOutput(response.data.output);
        
        // Save to history if user is logged in
        if (isLoggedIn && userEmail) {
          await axios.post(`${BACKEND_URL}/api/history/save`, {
            email: userEmail,
            language,
            code,
            input,
            output: response.data.output
          });
        }
      } else {
        setError(response.data.error || 'Execution failed');
        setOutput(response.data.output || '');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure backend is running.');
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const getMonacoLanguage = () => {
    switch (language) {
      case 'cpp':
        return 'cpp';
      case 'python':
        return 'python';
      case 'java':
        return 'java';
      default:
        return 'cpp';
    }
  };

  return (
    <div className="app">
      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Login to Save Your Code</h2>
            <p>Enter your email to automatically save your work</p>
            <input
              type="email"
              placeholder="Enter your email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLoginSubmit()}
              className="login-input"
              autoFocus
            />
            <div className="login-actions">
              <button onClick={() => setShowLoginModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleLoginSubmit} className="login-submit-btn">
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <History 
          userEmail={userEmail}
          onClose={() => setShowHistory(false)}
          onLoadCode={handleLoadFromHistory}
        />
      )}

      <Toolbar
        language={language}
        onLanguageChange={handleLanguageChange}
        onRun={handleRun}
        isRunning={isRunning}
        userEmail={userEmail}
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onSwitchAccount={handleSwitchAccount}
        onLogout={handleLogout}
        onShowHistory={handleShowHistory}
        saveStatus={saveStatus}
      />
      
      <Split
        className="split-container"
        sizes={[60, 40]}
        minSize={300}
        gutterSize={4}
        direction="horizontal"
      >
        <div className="editor-section">
          <Editor
            height="100%"
            language={getMonacoLanguage()}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
            }}
          />
        </div>

        <Split
          className="right-panel-split"
          sizes={[40, 60]}
          minSize={100}
          gutterSize={4}
          direction="vertical"
        >
          <div className="panel input-panel">
            <div className="panel-header">Input</div>
            <textarea
              className="input-textarea"
              placeholder="Enter program input here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          <div className="panel output-panel">
            <div className="panel-header">Output</div>
            <div className="output-content">
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
              <pre className={error ? 'output-text error' : 'output-text'}>
                {output || 'Output will appear here...'}
              </pre>
            </div>
          </div>
        </Split>
      </Split>
    </div>
  );
}

export default App;
