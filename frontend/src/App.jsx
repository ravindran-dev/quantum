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

  // New UI state
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState('output');
  const [sidebarSearch, setSidebarSearch] = useState('');

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

  const filteredFiles = projectFiles.filter((f) =>
    f.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  const displayName = isLoggedIn ? userEmail.split('@')[0] : 'Guest';

  return (
    <div className="ide-shell">

      {/* ── Login Modal ── */}
      {showLoginModal && (
        <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="login-modal-bg-glow"></div>
            <div className="login-modal-content">
              <h2>{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="login-subtitle">
                {isRegistering
                  ? 'Register to save and manage your code across sessions.'
                  : 'Enter your credentials to access your saved work.'}
              </p>
              {authError && (
                <div className="auth-error">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>{authError}</span>
                </div>
              )}
              <div className="login-form">
                <div className="input-group">
                  <div className="input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                  <input type="email" placeholder="Email Address" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className="login-input" autoFocus />
                </div>
                <div className="input-group">
                  <div className="input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                  <input type="password" placeholder="Password (min 4 chars)" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()} className="login-input" />
                </div>
                <div className="login-actions">
                  <button onClick={() => setShowLoginModal(false)} className="cancel-btn">Cancel</button>
                  <button onClick={handleLoginSubmit} className="login-submit-btn">
                    <span>{isRegistering ? 'Register' : 'Login'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="btn-icon"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </button>
                </div>
              </div>
              <div className="auth-toggle">
                {isRegistering ? (
                  <p>Already have an account?{' '}<span onClick={() => { setIsRegistering(false); setAuthError(''); }} className="toggle-link" role="button" tabIndex={0}>Login here</span></p>
                ) : (
                  <p>Don&apos;t have an account?{' '}<span onClick={() => { setIsRegistering(true); setAuthError(''); }} className="toggle-link" role="button" tabIndex={0}>Register here</span></p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {showSettingsModal && (
        <div className="settings-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h3>Editor Settings</h3>
              <button type="button" className="close-settings-btn" onClick={() => setShowSettingsModal(false)}>✕</button>
            </div>
            <div className="settings-row">
              <label htmlFor="font-size-range">Font Size: {editorFontSize}px</label>
              <input id="font-size-range" type="range" min="12" max="24" value={editorFontSize} onChange={(e) => setEditorFontSize(Number(e.target.value))} />
            </div>
            <div className="settings-row">
              <label htmlFor="word-wrap-select">Word Wrap</label>
              <select id="word-wrap-select" value={editorWordWrap} onChange={(e) => setEditorWordWrap(e.target.value)}>
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
              <label htmlFor="autosave-toggle">Auto Save</label>
              <input id="autosave-toggle" type="checkbox" checked={autoSaveEnabled} onChange={(e) => setAutoSaveEnabled(e.target.checked)} />
            </div>
            <div className="settings-actions">
              <button type="button" className="danger-btn" onClick={clearUploadedFiles}>Clear Uploaded Files</button>
              <button type="button" className="save-settings-btn" onClick={() => setShowSettingsModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Tab Modal ── */}
      {showProfileTab && (
        <div className="profile-tab-overlay" onClick={() => setShowProfileTab(false)}>
          <div className="profile-tab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-tab-header">
              <div className="profile-tab-avatar">{getAvatarLabel()}</div>
              <div className="profile-tab-identity">
                <h3>{displayName}</h3>
                <p>{isLoggedIn ? userEmail : 'Login required'}</p>
              </div>
              <button type="button" className="close-profile-tab" onClick={() => setShowProfileTab(false)}>✕</button>
            </div>
            <div className="profile-tab-grid">
              <div className="profile-stat-card"><span className="stat-label">Files</span><strong>{projectFiles.length}</strong></div>
              <div className="profile-stat-card"><span className="stat-label">Language</span><strong>{language.toUpperCase()}</strong></div>
              <div className="profile-stat-card"><span className="stat-label">Auto Save</span><strong>{autoSaveEnabled ? 'On' : 'Off'}</strong></div>
              <div className="profile-stat-card"><span className="stat-label">Theme</span><strong>{editorTheme}</strong></div>
            </div>
            <div className="profile-tab-actions">
              <button type="button" className="profile-tab-btn" onClick={handleShowHistory}>History</button>
              <button type="button" className="profile-tab-btn" onClick={() => { setShowProfileTab(false); setShowSettingsModal(true); }}>Settings</button>
              <button type="button" className="profile-tab-btn" onClick={clearUploadedFiles}>Clear Files</button>
              <button type="button" className="profile-tab-btn" onClick={handleSwitchAccount}>Switch Account</button>
              <button type="button" className="profile-tab-btn danger" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* ── History Modal ── */}
      {showHistory && (
        <History userEmail={userEmail} onClose={() => setShowHistory(false)} onLoadCode={handleLoadFromHistory} />
      )}

      {/* ════════════════════════════════════════════ */}
      {/* TOPBAR                                       */}
      {/* ════════════════════════════════════════════ */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-logo">&lt;/&gt;</div>
          <span className="topbar-title">Quantum</span>
        </div>

        <div className="topbar-center" ref={languageMenuRef}>
          <button
            className="lang-trigger"
            type="button"
            onClick={() => setShowLanguageMenu((p) => !p)}
            aria-expanded={showLanguageMenu}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span>{languageOptions.find((l) => l.id === language)?.label}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showLanguageMenu ? 'caret open' : 'caret'}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {showLanguageMenu && (
            <div className="lang-dropdown">
              {languageOptions.map((lang) => (
                <button key={lang.id} type="button" className={`lang-item ${language === lang.id ? 'active' : ''}`} onClick={() => handleLanguageChange(lang.id)}>
                  {lang.label}
                  <span className="lang-tag">{lang.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="topbar-right">
          {isLoggedIn && saveStatus && (
            <span className={`save-chip ${saveStatus}`}>{saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}</span>
          )}
          <button className="run-btn" onClick={handleRun} disabled={isRunning}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            {isRunning ? 'Running…' : 'Run'}
          </button>
          <button className="topbar-icon-btn" type="button" aria-label="Settings" onClick={() => setShowSettingsModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <div className="profile-menu-wrap" ref={profileMenuRef}>
            <button
              className="avatar-btn"
              type="button"
              onClick={() => {
                if (!isLoggedIn) { handleLogin(); return; }
                setShowProfileMenu((p) => !p);
              }}
              title={isLoggedIn ? userEmail : 'Login'}
            >
              {getAvatarLabel()}
            </button>
            {isLoggedIn && showProfileMenu && (
              <div className="profile-dropdown" role="menu">
                <div className="profile-email">{userEmail}</div>
                <button type="button" className="profile-item" onClick={handleOpenProfileTab}>Profile</button>
                <button type="button" className="profile-item" onClick={handleShowHistory}>History</button>
                <button type="button" className="profile-item" onClick={handleSwitchAccount}>Switch Account</button>
                <button type="button" className="profile-item danger" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════ */}
      {/* IDE BODY                                     */}
      {/* ════════════════════════════════════════════ */}
      <div className="ide-body">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="sidebar">
          {/* Search */}
          <div className="sidebar-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sidebar-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="sidebar-search"
              type="text"
              placeholder="Search files…"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
            />
          </div>

          {/* Files section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>FILES</span>
              <button className="sidebar-icon-btn" type="button" onClick={handleFilesUploadClick} title="Upload files">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M5 20h14"/></svg>
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept=".py,.java,.cpp,.cc,.cxx,.c,.hpp,.h,.txt" multiple className="hidden-file-input" onChange={handleFilesSelected} />
            {projectNotice && <div className="sidebar-notice">{projectNotice}</div>}
            <ul className="file-list">
              {filteredFiles.length === 0 && <li className="empty-files">{sidebarSearch ? 'No match' : 'No files uploaded'}</li>}
              {filteredFiles.map((file) => (
                <li key={file.name} className="file-item-row">
                  <button className={`file-btn ${activeFileName === file.name ? 'active' : ''}`} type="button" onClick={() => handleOpenProjectFile(file)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="file-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span className="file-name">{file.name}</span>
                  </button>
                  <button type="button" className="file-remove-btn" title={`Remove ${file.name}`} onClick={(e) => { e.stopPropagation(); handleDeleteProjectFile(file.name); }}>✕</button>
                </li>
              ))}
            </ul>
          </div>

          {/* History section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>HISTORY</span>
              <button className="sidebar-icon-btn" type="button" onClick={handleShowHistory} title="View full history">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </button>
            </div>
            {!isLoggedIn ? (
              <p className="sidebar-hint">Login to see history</p>
            ) : (
              <p className="sidebar-hint">Click clock icon to view full history</p>
            )}
          </div>
        </aside>

        {/* ── EDITOR MAIN ── */}
        <div className="editor-main">

          {/* Active file tab strip */}
          <div className="editor-tabs">
            {activeFileName ? (
              <div className="editor-tab active">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {activeFileName}
              </div>
            ) : (
              <div className="editor-tab active">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                {language === 'cpp' ? 'main.cpp' : language === 'python' ? 'main.py' : 'Main.java'}
              </div>
            )}
            {error && <span className="editor-tab-error">⚠ Error</span>}
          </div>

          {/* Monaco Editor */}
          <div className="editor-wrap">
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
                glyphMargin: false,
                smoothScrolling: true,
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>

          {/* ── BOTTOM PANEL ── */}
          <div className={`bottom-panel ${bottomPanelCollapsed ? 'collapsed' : ''}`}>
            <div className="panel-tabs">
              {['output', 'terminal', 'problems'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`panel-tab ${activeBottomTab === tab ? 'active' : ''}`}
                  onClick={() => {
                    setActiveBottomTab(tab);
                    if (bottomPanelCollapsed) setBottomPanelCollapsed(false);
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'problems' && error && <span className="panel-badge">1</span>}
                </button>
              ))}
              <div className="panel-tabs-spacer" />
              {/* Stdin label */}
              <span className="panel-stdin-label">stdin:</span>
              <input
                className="panel-stdin-input"
                type="text"
                placeholder="Enter input…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="button"
                className="panel-collapse-btn"
                onClick={() => setBottomPanelCollapsed((p) => !p)}
                title={bottomPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={bottomPanelCollapsed ? 'rotated' : ''}><polyline points="18 15 12 9 6 15"/></svg>
              </button>
            </div>

            {!bottomPanelCollapsed && (
              <div className="panel-content">
                {activeBottomTab === 'output' && (
                  <pre className="panel-output">
                    {isRunning
                      ? '⟳ Running…'
                      : output
                      ? output
                      : 'Output will appear here after you run the program.'}
                  </pre>
                )}
                {activeBottomTab === 'terminal' && (
                  <pre className="panel-output panel-terminal">
                    {'$ quantum-run ' + (language === 'cpp' ? 'main.cpp' : language === 'python' ? 'main.py' : 'Main.java') + '\n'}
                    {isRunning
                      ? 'INFO: Quantum Execution Engine running…'
                      : 'INFO: Quantum Execution Engine ready.'}
                    {output ? '\n' + output : ''}
                  </pre>
                )}
                {activeBottomTab === 'problems' && (
                  <div className="panel-output">
                    {error
                      ? <div className="panel-error-row"><span className="panel-error-icon">✕</span>{error}</div>
                      : <span className="panel-no-problems">No problems detected.</span>
                    }
                  </div>
                )}
              </div>
            )}
          </div>

        </div>{/* end editor-main */}
      </div>{/* end ide-body */}
    </div>
  );
}

export default App;
