import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import History from './components/History';
import './App.css';

const BACKEND_URL = 'http://localhost:5000';

const legacyDefaultCode = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, C++!" << endl;
    return 0;
}`
};

const defaultCode = {
  cpp: `#include <bits/stdc++.h>
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

const languageOptions = [
  { id: 'python', label: 'Python', tag: 'Py' },
  { id: 'cpp', label: 'C++', tag: 'C+' },
  { id: 'java', label: 'Java', tag: 'Jv' }
];

function detectLanguageFromFileName(fileName) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.py')) {
    return 'python';
  }

  if (lower.endsWith('.java')) {
    return 'java';
  }

  if (
    lower.endsWith('.cpp') ||
    lower.endsWith('.cc') ||
    lower.endsWith('.cxx') ||
    lower.endsWith('.c') ||
    lower.endsWith('.hpp') ||
    lower.endsWith('.h')
  ) {
    return 'cpp';
  }

  return null;
}

function getInitialCode(language, savedCode) {
  if (!savedCode) {
    return defaultCode[language];
  }

  const legacyCode = legacyDefaultCode[language];
  if (legacyCode && savedCode.trim() === legacyCode.trim()) {
    return defaultCode[language];
  }

  return savedCode;
}

function App() {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(defaultCode.cpp);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState('output');
  const [saveStatus, setSaveStatus] = useState('');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileTab, setShowProfileTab] = useState(false);
  const [projectFiles, setProjectFiles] = useState([]);
  const [activeFileName, setActiveFileName] = useState('');
  const [projectNotice, setProjectNotice] = useState('');

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(15);
  const [editorWordWrap, setEditorWordWrap] = useState('on');
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const fileInputRef = useRef(null);
  const skipSavedLoadRef = useRef(false);
  const languageMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const activeFileSaveTimerRef = useRef(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    const savedIsLoggedIn = localStorage.getItem('isLoggedIn');

    if (savedEmail && savedIsLoggedIn === 'true') {
      setUserEmail(savedEmail);
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setShowLanguageMenu(false);
      }

      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !userEmail) {
      setProjectFiles([]);
      setActiveFileName('');
      return;
    }

    const loadProjectFiles = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/project-files/${encodeURIComponent(userEmail)}`);
        const files = Array.isArray(response.data.files) ? response.data.files : [];
        const normalizedFiles = files
          .filter((file) => file && typeof file.name === 'string')
          .map((file) => ({
            name: file.name,
            content: typeof file.content === 'string' ? file.content : '',
            language: detectLanguageFromFileName(file.name) || file.language || 'python'
          }));

        setProjectFiles(normalizedFiles);
        setActiveFileName((prevActiveFileName) =>
          normalizedFiles.some((file) => file.name === prevActiveFileName) ? prevActiveFileName : ''
        );
      } catch (loadErr) {
        console.error('Failed to load project files:', loadErr);
        setProjectFiles([]);
        setActiveFileName('');
      }
    };

    loadProjectFiles();
  }, [isLoggedIn, userEmail]);

  const loadSavedCodeForLanguage = async (targetLanguage) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/code/${userEmail}/${targetLanguage}`);
      const savedCode = response.data.code;
      const initialCode = getInitialCode(targetLanguage, savedCode);

      setCode(initialCode);

      if (savedCode && initialCode !== savedCode) {
        await axios.post(`${BACKEND_URL}/api/code/save`, {
          email: userEmail,
          language: targetLanguage,
          code: initialCode
        });
      }
    } catch (err) {
      console.error('Failed to load code:', err);
      setCode(defaultCode[targetLanguage]);
    }
  };

  const loadSavedCode = async () => {
    await loadSavedCodeForLanguage(language);
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

  useEffect(() => {
    if (skipSavedLoadRef.current) {
      skipSavedLoadRef.current = false;
      return;
    }

    // While an uploaded project file is selected, keep editor content tied to that file.
    // This avoids backend language restores from overwriting uploaded file code.
    if (activeFileName) {
      return;
    }

    if (isLoggedIn && userEmail) {
      loadSavedCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, userEmail, isLoggedIn, activeFileName]);

  useEffect(() => {
    if (isLoggedIn && userEmail && code && autoSaveEnabled) {
      const timer = setTimeout(() => {
        saveCode();
      }, 2000);

      return () => clearTimeout(timer);
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, userEmail, isLoggedIn, autoSaveEnabled]);

  const handleEditorChange = (value) => {
    const nextCode = value || '';
    setCode(nextCode);

    if (!activeFileName) {
      return;
    }

    // Only persist content changes to the selected uploaded file when user edits.
    setProjectFiles((prevFiles) =>
      prevFiles.map((file) => {
        if (file.name !== activeFileName) {
          return file;
        }

        if (file.content === nextCode) {
          return file;
        }

        return {
          ...file,
          content: nextCode
        };
      })
    );

    if (!isLoggedIn || !userEmail) {
      return;
    }

    const activeFileLanguage = detectLanguageFromFileName(activeFileName) || language;

    if (activeFileSaveTimerRef.current) {
      clearTimeout(activeFileSaveTimerRef.current);
    }

    activeFileSaveTimerRef.current = setTimeout(async () => {
      try {
        await axios.post(`${BACKEND_URL}/api/project-files/save`, {
          email: userEmail,
          name: activeFileName,
          language: activeFileLanguage,
          content: nextCode
        });
      } catch (saveErr) {
        console.error('Failed to autosave active project file:', saveErr);
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (activeFileSaveTimerRef.current) {
        clearTimeout(activeFileSaveTimerRef.current);
      }
    };
  }, []);

  const saveProjectFileToDb = async (file) => {
    await axios.post(`${BACKEND_URL}/api/project-files/save`, {
      email: userEmail,
      name: file.name,
      language: file.language,
      content: file.content
    });
  };

  const handleLogin = () => {
    setUserEmail('');
    setUserPassword('');
    setAuthError('');
    setIsRegistering(false);
    setShowLoginModal(true);
  };

  const handleLoginSubmit = async () => {
    if (!userEmail.trim() || !userPassword.trim()) {
      setAuthError('Email and password are required');
      return;
    }

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const response = await axios.post(`${BACKEND_URL}${endpoint}`, {
        email: userEmail,
        password: userPassword
      });

      if (response.data.success) {
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setAuthError('');
        setUserPassword('');
        localStorage.setItem('userEmail', userEmail);
        localStorage.setItem('isLoggedIn', 'true');
        loadSavedCode();
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Authentication failed');
    }
  };

  const handleSwitchAccount = () => {
    setShowProfileMenu(false);
    setShowProfileTab(false);
    setUserEmail('');
    setUserPassword('');
    setIsLoggedIn(false);
    setCode(defaultCode[language]);
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isLoggedIn');
    setShowLoginModal(true);
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    setShowProfileTab(false);
    setUserEmail('');
    setIsLoggedIn(false);
    setCode(defaultCode[language]);
    setInput('');
    setOutput('');
    setError('');
    setProjectFiles([]);
    setActiveFileName('');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isLoggedIn');
  };

  const handleShowHistory = () => {
    setShowProfileMenu(false);
    if (!isLoggedIn) {
      handleLogin();
      return;
    }

    setShowHistory(true);
  };

  const handleLoadFromHistory = (historyItem) => {
    setLanguage(historyItem.language);
    setCode(historyItem.code);
    setInput(historyItem.input || '');
    setOutput(historyItem.output || '');
  };

  const handleLanguageChange = (newLanguage) => {
    setShowLanguageMenu(false);

    // Dropdown language switching should show language-specific code and exit file-focused mode.
    setActiveFileName('');
    skipSavedLoadRef.current = true;

    setLanguage(newLanguage);
    setOutput('');
    setError('');

    if (isLoggedIn && userEmail) {
      loadSavedCodeForLanguage(newLanguage);
      return;
    }

    if (!isLoggedIn) {
      setCode(defaultCode[newLanguage]);
    }
  };

  const handleFilesUploadClick = () => {
    if (!isLoggedIn) {
      handleLogin();
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFilesSelected = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) {
      return;
    }

    const nextFiles = await Promise.all(
      selectedFiles.map(async (file) => {
        const text = await file.text();
        const detectedLanguage = detectLanguageFromFileName(file.name) || language;

        return {
          name: file.name,
          language: detectedLanguage,
          content: text
        };
      })
    );

    try {
      await Promise.all(nextFiles.map((file) => saveProjectFileToDb(file)));
      setProjectNotice('Files uploaded and saved.');
      setTimeout(() => setProjectNotice(''), 1800);
    } catch (saveErr) {
      console.error('Failed to save uploaded files:', saveErr);
      setProjectNotice('Some files failed to save. Check backend and retry.');
      setTimeout(() => setProjectNotice(''), 2500);
    }

    setProjectFiles((prevFiles) => {
      const nonOverridden = prevFiles.filter(
        (existingFile) => !nextFiles.some((incomingFile) => incomingFile.name === existingFile.name)
      );
      return [...nonOverridden, ...nextFiles];
    });

    const firstFile = nextFiles[0];
    if (firstFile) {
      skipSavedLoadRef.current = true;
      setActiveFileName(firstFile.name);
      setLanguage(firstFile.language);
      setCode(firstFile.content);
      setOutput('');
      setError('');
    }

    event.target.value = '';
  };

  const handleOpenProjectFile = (file) => {
    const detectedLanguage = detectLanguageFromFileName(file.name) || file.language || language;

    setActiveFileName(file.name);
    skipSavedLoadRef.current = true;
    setLanguage(detectedLanguage);
    setCode(file.content || defaultCode[detectedLanguage]);
    setOutput('');
    setError('');
  };

  const handleDeleteProjectFile = async (fileName) => {
    if (!isLoggedIn || !userEmail) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/project-files/${encodeURIComponent(userEmail)}/${encodeURIComponent(fileName)}`);

      setProjectFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));

      if (activeFileName === fileName) {
        setActiveFileName('');
        if (isLoggedIn && userEmail) {
          loadSavedCodeForLanguage(language);
        } else {
          setCode(defaultCode[language]);
        }
      }
    } catch (deleteErr) {
      console.error('Failed to delete project file:', deleteErr);
      setProjectNotice('Failed to remove file. Restart backend and try again.');
      setTimeout(() => setProjectNotice(''), 2500);
    }
  };

  const clearUploadedFiles = () => {
    if (!isLoggedIn || !userEmail) {
      return;
    }

    axios
      .delete(`${BACKEND_URL}/api/project-files/${encodeURIComponent(userEmail)}`)
      .then(() => {
        setProjectFiles([]);
        setActiveFileName('');
      })
      .catch((clearErr) => {
        console.error('Failed to clear project files:', clearErr);
        setProjectNotice('Failed to clear files. Please try again.');
        setTimeout(() => setProjectNotice(''), 2500);
      });
  };

  const handleOpenProfileTab = () => {
    if (!isLoggedIn) {
      handleLogin();
      return;
    }

    setShowProfileMenu(false);
    setShowProfileTab(true);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setError('');
    setActiveResultTab('output');

    try {
      const response = await axios.post(`${BACKEND_URL}/api/compile`, {
        code,
        language,
        input
      });

      if (response.data.success) {
        setOutput(response.data.output);

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
        setActiveResultTab('errors');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure backend is running.');
      setActiveResultTab('errors');
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const getAvatarLabel = () => {
    if (!isLoggedIn || !userEmail) {
      return 'AL';
    }

    const name = userEmail.split('@')[0];
    return name.slice(0, 2).toUpperCase();
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

  const runtimeMs = output ? Math.max(120, output.length * 4) : 0;
  const cpuUsage = isRunning ? 32 : 18;
  const memoryUsage = isRunning ? '28MB' : '12MB';

  const terminalText = [
    '(venv) $ python main.py',
    isRunning ? 'INFO: Quantum Execution Engine running...' : 'INFO: Quantum Execution Engine ready.',
    output ? `OUTPUT: ${output.split('\n')[0]}` : 'OUTPUT: Waiting for program execution...'
  ].join('\n');

  const displayName = isLoggedIn ? userEmail.split('@')[0] : 'Guest User';
  const uploadedFilesCount = projectFiles.length;

  return (
    <div className="ide-shell">
      <div className="bg-grid" aria-hidden="true"></div>
      <div className="bg-glow bg-glow-left" aria-hidden="true"></div>
      <div className="bg-glow bg-glow-right" aria-hidden="true"></div>

      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{isRegistering ? 'Create Account' : 'Login to Save Your Code'}</h2>
            <p>
              {isRegistering
                ? 'Register to save and manage your code'
                : 'Enter your credentials to access your saved work'}
            </p>

            {authError && <div className="auth-error">{authError}</div>}

            <input
              type="email"
              placeholder="Enter your email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="login-input"
              autoFocus
            />
            <input
              type="password"
              placeholder="Enter your password (min 4 characters)"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()}
              className="login-input"
            />
            <div className="login-actions">
              <button onClick={() => setShowLoginModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleLoginSubmit} className="login-submit-btn">
                {isRegistering ? 'Register' : 'Login'}
              </button>
            </div>
            <div className="auth-toggle">
              {isRegistering ? (
                <p>
                  Already have an account?{' '}
                  <span
                    onClick={() => {
                      setIsRegistering(false);
                      setAuthError('');
                    }}
                    className="toggle-link"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setIsRegistering(false)}
                  >
                    Login here
                  </span>
                </p>
              ) : (
                <p>
                  Don&apos;t have an account?{' '}
                  <span
                    onClick={() => {
                      setIsRegistering(true);
                      setAuthError('');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setIsRegistering(true)}
                  >
                    Register here
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="settings-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h3>Compiler Settings</h3>
              <button type="button" className="close-settings-btn" onClick={() => setShowSettingsModal(false)}>
                x
              </button>
            </div>

            <div className="settings-row">
              <label htmlFor="font-size-range">Editor Font Size: {editorFontSize}px</label>
              <input
                id="font-size-range"
                type="range"
                min="12"
                max="24"
                value={editorFontSize}
                onChange={(e) => setEditorFontSize(Number(e.target.value))}
              />
            </div>

            <div className="settings-row">
              <label htmlFor="word-wrap-select">Word Wrap</label>
              <select
                id="word-wrap-select"
                value={editorWordWrap}
                onChange={(e) => setEditorWordWrap(e.target.value)}
              >
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>

            <div className="settings-row">
              <label htmlFor="theme-select">Editor Theme</label>
              <select id="theme-select" value={editorTheme} onChange={(e) => setEditorTheme(e.target.value)}>
                <option value="vs-dark">Dark</option>
                <option value="vs-light">Light</option>
                <option value="hc-black">High Contrast</option>
              </select>
            </div>

            <div className="settings-row checkbox-row">
              <label htmlFor="autosave-toggle">Auto Save to Account</label>
              <input
                id="autosave-toggle"
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              />
            </div>

            <div className="settings-actions">
              <button type="button" className="danger-btn" onClick={clearUploadedFiles}>
                Clear Uploaded Files
              </button>
              <button type="button" className="save-settings-btn" onClick={() => setShowSettingsModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileTab && (
        <div className="profile-tab-overlay" onClick={() => setShowProfileTab(false)}>
          <div className="profile-tab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-tab-header">
              <div className="profile-tab-avatar">{getAvatarLabel()}</div>
              <div className="profile-tab-identity">
                <h3>{displayName}</h3>
                <p>{isLoggedIn ? userEmail : 'Login required'}</p>
              </div>
              <button type="button" className="close-profile-tab" onClick={() => setShowProfileTab(false)}>
                x
              </button>
            </div>

            <div className="profile-tab-grid">
              <div className="profile-stat-card">
                <span className="stat-label">Uploaded Files</span>
                <strong>{uploadedFilesCount}</strong>
              </div>
              <div className="profile-stat-card">
                <span className="stat-label">Current Language</span>
                <strong>{language.toUpperCase()}</strong>
              </div>
              <div className="profile-stat-card">
                <span className="stat-label">Auto Save</span>
                <strong>{autoSaveEnabled ? 'Enabled' : 'Disabled'}</strong>
              </div>
              <div className="profile-stat-card">
                <span className="stat-label">Editor Theme</span>
                <strong>{editorTheme}</strong>
              </div>
            </div>

            <div className="profile-tab-actions">
              <button type="button" className="profile-tab-btn" onClick={handleShowHistory}>
                Open History
              </button>
              <button
                type="button"
                className="profile-tab-btn"
                onClick={() => {
                  setShowProfileTab(false);
                  setShowSettingsModal(true);
                }}
              >
                Open Settings
              </button>
              <button type="button" className="profile-tab-btn" onClick={clearUploadedFiles}>
                Clear Uploaded Files
              </button>
              <button type="button" className="profile-tab-btn" onClick={handleSwitchAccount}>
                Switch Account
              </button>
              <button type="button" className="profile-tab-btn danger" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <History userEmail={userEmail} onClose={() => setShowHistory(false)} onLoadCode={handleLoadFromHistory} />
      )}

      <div className="ide-app">
        <header className="top-nav glass-panel">
          <div className="top-nav-left">
            <div className="logo-pill" aria-hidden="true">
              {'</>'}
            </div>
            <div className="project-name">Quantum</div>
          </div>

          <div className="top-nav-center">
            <div className="language-menu-wrap" ref={languageMenuRef}>
              <button
                className="language-menu-trigger"
                type="button"
                onClick={() => setShowLanguageMenu((prev) => !prev)}
                aria-expanded={showLanguageMenu}
              >
                <span className="language-trigger-main">
                  {languageOptions.find((item) => item.id === language)?.label}
                </span>
                <span className="language-tag" aria-hidden="true">
                  {languageOptions.find((item) => item.id === language)?.tag}
                </span>
                <span className={`language-caret ${showLanguageMenu ? 'open' : ''}`} aria-hidden="true">
                  ▾
                </span>
              </button>

              <div className={`language-dropdown ${showLanguageMenu ? 'open' : ''}`}>
                {languageOptions.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    className={`language-item ${language === lang.id ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(lang.id)}
                  >
                    <span>{lang.label}</span>
                    <span className="language-item-tag">{lang.tag}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="top-nav-right">
            {isLoggedIn && saveStatus && (
              <div className={`save-chip ${saveStatus}`}>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</div>
            )}
            <button className="run-btn" onClick={handleRun} disabled={isRunning}>
              {isRunning ? 'RUNNING' : 'RUN'} <span aria-hidden="true">▶</span>
            </button>
            <button className="icon-btn" type="button" aria-label="Settings" onClick={() => setShowSettingsModal(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.1 7.1 0 0 0-1.62-.95l-.36-2.54a.5.5 0 0 0-.5-.42h-3.8a.5.5 0 0 0-.5.42l-.36 2.54a7.1 7.1 0 0 0-1.62.95l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94L2.82 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.31.6.22l2.39-.96c.5.4 1.04.72 1.62.95l.36 2.54a.5.5 0 0 0 .5.42h3.8a.5.5 0 0 0 .5-.42l.36-2.54c.58-.23 1.12-.55 1.62-.95l2.39.96c.2.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.56zM12 15.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <div className="profile-menu-wrap" ref={profileMenuRef}>
              <button
                className="avatar-btn"
                type="button"
                onClick={() => {
                  if (!isLoggedIn) {
                    handleLogin();
                    return;
                  }
                  setShowProfileMenu((prev) => !prev);
                }}
                title={isLoggedIn ? userEmail : 'Login'}
              >
                {getAvatarLabel()}
              </button>

              {isLoggedIn && showProfileMenu && (
                <div className="profile-dropdown" role="menu" aria-label="Profile menu">
                  <div className="profile-email">{userEmail}</div>
                  <button type="button" className="profile-item" onClick={handleOpenProfileTab}>
                    Open Profile
                  </button>
                  <button type="button" className="profile-item" onClick={handleShowHistory}>
                    History
                  </button>
                  <button type="button" className="profile-item" onClick={handleSwitchAccount}>
                    Switch Account
                  </button>
                  <button type="button" className="profile-item danger" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="workspace-grid">
          <aside className="project-sidebar glass-panel">
            <div className="icon-rail">
              <button
                className="rail-icon active"
                type="button"
                onClick={handleFilesUploadClick}
                title="Upload files"
                aria-label="Upload files"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
              </button>
              <button
                className="rail-icon"
                type="button"
                onClick={handleShowHistory}
                title="History"
                aria-label="History"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M3 4v4h4M12 7v6l4 2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </div>

            <div className="project-tree">
              <div className="tree-header">
                <span>PROJECTS</span>
                <button className="tree-add-btn" type="button" onClick={handleFilesUploadClick} title="Upload files">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 16V5M12 5l-4 4M12 5l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {projectNotice && <div className="project-notice">{projectNotice}</div>}

              <input
                ref={fileInputRef}
                type="file"
                accept=".py,.java,.cpp,.cc,.cxx,.c,.hpp,.h,.txt"
                multiple
                className="hidden-file-input"
                onChange={handleFilesSelected}
              />

              <ul className="file-list">
                {projectFiles.length === 0 && <li className="empty-files">No uploaded files yet</li>}
                {projectFiles.map((file) => (
                  <li key={file.name} className="file-item-row">
                    <button
                      className={`file-btn ${activeFileName === file.name ? 'active' : ''}`}
                      type="button"
                      onClick={() => handleOpenProjectFile(file)}
                    >
                      <span className="file-dot" aria-hidden="true">
                        •
                      </span>
                      {file.name}
                    </button>
                    <button
                      type="button"
                      className="file-remove-btn"
                      title={`Remove ${file.name}`}
                      aria-label={`Remove ${file.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProjectFile(file.name);
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <section className="editor-zone">
            <div className="editor-card glass-panel">
              <div className="editor-toolbar">
                <span className="editor-title">{language.toUpperCase()} Workspace</span>
                <span className="editor-status">{error ? 'Syntax error detected' : 'Ready to compile'}</span>
              </div>
              <div className="editor-body">
                <Editor
                  height="100%"
                  language={getMonacoLanguage()}
                  value={code}
                  onChange={handleEditorChange}
                  theme={editorTheme}
                  options={{
                    fontSize: editorFontSize,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    wordWrap: editorWordWrap,
                    lineNumbers: 'on',
                    renderLineHighlight: 'line',
                    cursorBlinking: 'smooth',
                    glyphMargin: true,
                    smoothScrolling: true
                  }}
                />

              </div>
            </div>

            <div className="bottom-grid">
              <div className="input-card glass-panel">
                <div className="section-header">INPUT</div>
                <textarea
                  className="input-textarea"
                  placeholder="Enter value: 20"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>

              <div className="terminal-card glass-panel">
                <div className="terminal-tabs">
                  <button className="terminal-tab active" type="button">
                    TERMINAL
                  </button>
                  <button className="terminal-tab" type="button">
                    DEBUG
                  </button>
                </div>
                <pre className="terminal-output">{terminalText}</pre>
              </div>
            </div>
          </section>

          <aside className="execution-panel glass-panel">
            <div className="execution-title">Execution Results</div>
            <div className="result-tabs">
              <button
                className={`result-tab ${activeResultTab === 'output' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveResultTab('output')}
              >
                OUTPUT
              </button>
              <button
                className={`result-tab ${activeResultTab === 'errors' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveResultTab('errors')}
              >
                ERRORS
              </button>
              <button
                className={`result-tab ${activeResultTab === 'stats' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveResultTab('stats')}
              >
                STATS
              </button>
            </div>

            {activeResultTab === 'output' && (
              <div className="result-card">
                <div className="result-meta">QuantumCompiler | {language.toUpperCase()} Runtime</div>
                <div className="result-runtime">Runtime: {runtimeMs}ms</div>
                <pre className={error ? 'output-text error' : 'output-text'}>
                  {output || 'Output will appear here after you run the program.'}
                </pre>
                <div className={`running-indicator ${isRunning ? 'active' : ''}`}>
                  {isRunning ? 'Running...' : 'Idle'}
                </div>
              </div>
            )}

            {activeResultTab === 'errors' && (
              <div className="result-card">
                {error ? <div className="error-message">{error}</div> : <div className="no-error">No errors found.</div>}
              </div>
            )}

            {activeResultTab === 'stats' && (
              <div className="result-card">
                <div className="stats-graph" aria-hidden="true">
                  <svg viewBox="0 0 300 100" preserveAspectRatio="none">
                    <path d="M0,70 C20,50 40,80 60,62 C80,44 100,56 120,40 C140,26 160,50 180,36 C200,24 220,34 240,22 C260,14 280,30 300,12" />
                  </svg>
                </div>
                <div className="stats-values">
                  <span>CPU {cpuUsage}%</span>
                  <span>Memory {memoryUsage}</span>
                </div>
              </div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}

export default App;
