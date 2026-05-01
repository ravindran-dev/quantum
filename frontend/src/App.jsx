import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import History from './components/History';
import './App.css';

const BACKEND_URL = 'http://localhost:5000';

const defaultCode = {
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    cout << "Hello, Quantum C++!" << endl;\n    return 0;\n}`,
  python: `print("Hello, Quantum Python!")`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Quantum Java!");\n    }\n}`
};

const languageOptions = [
  { id: 'python', label: 'Python', tag: 'Py' },
  { id: 'cpp', label: 'C++', tag: 'C+' },
  { id: 'java', label: 'Java', tag: 'Jv' }
];

function detectLanguageFromFileName(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.java')) return 'java';
  if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.c') || lower.endsWith('.h')) return 'cpp';
  return null;
}

function App() {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(defaultCode.cpp);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [latencyMs, setLatencyMs] = useState(null);

  // Auth & Project State
  const [userEmail, setUserEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [userPassword, setUserPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [projectFiles, setProjectFiles] = useState([]);
  const [activeFileName, setActiveFileName] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');

  // UI State
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef(null);
  const languageMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    const savedIsLoggedIn = localStorage.getItem('isLoggedIn');
    if (savedEmail && savedIsLoggedIn === 'true') {
      setUserEmail(savedEmail);
      setIsLoggedIn(true);
    }

    const handleOutsideClick = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) setShowLanguageMenu(false);
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLanguageChange = (newLanguage) => {
    setShowLanguageMenu(false);
    setActiveFileName('');
    setLanguage(newLanguage);
    setCode(defaultCode[newLanguage]);
    setOutput('');
    setError('');
    setLatencyMs(null);
  };

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
        setProjectFiles(files);
        setActiveFileName(prev => files.some(f => f.name === prev) ? prev : '');
      } catch (err) {
        console.error('Failed to load files', err);
      }
    };
    loadProjectFiles();
  }, [isLoggedIn, userEmail]);

  const handleFilesUploadClick = () => {
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFilesSelected = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    const nextFiles = await Promise.all(selectedFiles.map(async file => ({
      name: file.name,
      language: detectLanguageFromFileName(file.name) || language,
      content: await file.text()
    })));

    try {
      await Promise.all(nextFiles.map(file => axios.post(`${BACKEND_URL}/api/project-files/save`, {
        email: userEmail, name: file.name, language: file.language, content: file.content
      })));
      setProjectFiles(prev => {
        const nonOverridden = prev.filter(p => !nextFiles.some(n => n.name === p.name));
        return [...nonOverridden, ...nextFiles];
      });
      if (nextFiles[0]) {
        setActiveFileName(nextFiles[0].name);
        setLanguage(nextFiles[0].language);
        setCode(nextFiles[0].content);
      }
    } catch (err) { console.error('Failed to save uploaded files:', err); }
    event.target.value = '';
  };

  const handleOpenProjectFile = (file) => {
    setActiveFileName(file.name);
    setLanguage(file.language || detectLanguageFromFileName(file.name) || language);
    setCode(file.content || defaultCode[file.language]);
    setOutput('');
    setError('');
  };

  const handleDeleteProjectFile = async (fileName, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${BACKEND_URL}/api/project-files/${encodeURIComponent(userEmail)}/${encodeURIComponent(fileName)}`);
      setProjectFiles(prev => prev.filter(f => f.name !== fileName));
      if (activeFileName === fileName) {
        setActiveFileName('');
        setCode(defaultCode[language]);
      }
    } catch (err) { console.error('Failed to delete file', err); }
  };

  const handleEditorChange = (value) => {
    const nextCode = value || '';
    setCode(nextCode);

    if (activeFileName && isLoggedIn && userEmail) {
      setProjectFiles(prevFiles => prevFiles.map(f => f.name === activeFileName ? { ...f, content: nextCode } : f));
      
      if (window.saveTimer) clearTimeout(window.saveTimer);
      window.saveTimer = setTimeout(() => {
        axios.post(`${BACKEND_URL}/api/project-files/save`, {
          email: userEmail,
          name: activeFileName,
          language: detectLanguageFromFileName(activeFileName) || language,
          content: nextCode
        }).catch(err => console.error("Autosave error", err));
      }, 1000);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setError('');
    setLatencyMs(null);
    setBottomPanelCollapsed(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const startTime = performance.now();

    try {
      const response = await axios.post(`${BACKEND_URL}/api/compile`, {
        code,
        language,
        input
      }, {
        signal: abortControllerRef.current.signal
      });

      const endTime = performance.now();
      setLatencyMs(Math.round(endTime - startTime));

      if (response.data.success) {
        setOutput(response.data.output || 'Execution completed with no output.');
        if (isLoggedIn && userEmail) {
          axios.post(`${BACKEND_URL}/api/history/save`, {
            email: userEmail, language, code, input, output: response.data.output
          }).catch(console.error);
        }
      } else {
        setError(response.data.error || 'Execution failed');
        setOutput(response.data.output || '');
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Request canceled');
      } else {
        setError('Failed to connect to server. Ensure backend is running.');
        console.error(err);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleLoginSubmit = async () => {
    if (!userEmail.trim() || !userPassword.trim()) {
      setAuthError('Email and password are required');
      return;
    }
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const response = await axios.post(`${BACKEND_URL}${endpoint}`, { email: userEmail, password: userPassword });
      if (response.data.success) {
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setAuthError('');
        setUserPassword('');
        localStorage.setItem('userEmail', userEmail);
        localStorage.setItem('isLoggedIn', 'true');
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
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

  const getMonacoLanguage = () => (language === 'cpp' ? 'cpp' : language);
  const filteredFiles = projectFiles.filter((f) => f.name.toLowerCase().includes(sidebarSearch.toLowerCase()));

  return (
    <div className="ide-shell">
      
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{isRegistering ? 'INITIALIZE LINK' : 'ACCESS UPLINK'}</h2>
            {authError && <div style={{color:'var(--neon-red)', marginBottom:'10px', textAlign:'center'}}>{authError}</div>}
            
            <div className="input-group">
              <input type="email" placeholder="Email Identification" value={userEmail} onChange={e => setUserEmail(e.target.value)} className="neon-input" autoFocus />
            </div>
            <div className="input-group">
              <input type="password" placeholder="Passcode (min 4 chars)" value={userPassword} onChange={e => setUserPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()} className="neon-input" />
            </div>
            
            <button onClick={handleLoginSubmit} className="neon-btn">
              {isRegistering ? 'REGISTER' : 'LOGIN'}
            </button>
            <div style={{marginTop:'15px', textAlign:'center', fontSize:'13px', color:'var(--text-muted)'}}>
              {isRegistering ? (
                <p>Existing agent? <span onClick={() => {setIsRegistering(false); setAuthError('');}} style={{color:'var(--neon-cyan)', cursor:'pointer'}}>Login here</span></p>
              ) : (
                <p>New agent? <span onClick={() => {setIsRegistering(true); setAuthError('');}} style={{color:'var(--neon-cyan)', cursor:'pointer'}}>Register here</span></p>
              )}
            </div>
          </div>
        </div>
      )}

      {showHistory && <History userEmail={userEmail} onClose={() => setShowHistory(false)} onLoadCode={(item) => { setLanguage(item.language); setCode(item.code); setInput(item.input||''); setOutput(item.output||''); setShowHistory(false); }} />}

      {/* TOPBAR */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-logo">{'</Q>'}</div>
          <span className="topbar-title">QUANTUM COMPILER</span>
        </div>

        <div className="topbar-center" ref={languageMenuRef}>
          <button className="lang-trigger" onClick={() => setShowLanguageMenu(p => !p)}>
            <span>{languageOptions.find(l => l.id === language)?.label || 'LANG'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showLanguageMenu ? 'caret open' : 'caret'}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {showLanguageMenu && (
            <div className="lang-dropdown">
              {languageOptions.map(lang => (
                <button key={lang.id} className={`lang-item ${language === lang.id ? 'active' : ''}`} onClick={() => handleLanguageChange(lang.id)}>
                  {lang.label} <span className="lang-tag">{lang.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="topbar-right">
          {latencyMs !== null && <span className="latency-display">{latencyMs}ms</span>}
          {saveStatus && <span className={`save-chip ${saveStatus}`}>{saveStatus === 'saving' ? 'SYNCING...' : 'SYNCED'}</span>}
          
          <button className="run-btn" onClick={handleRun} disabled={isRunning}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            {isRunning ? 'EXECUTING...' : 'EXECUTE'}
          </button>

          <div className="profile-menu-wrap" ref={profileMenuRef}>
            <button className="avatar-btn" onClick={() => { if(!isLoggedIn) setShowLoginModal(true); else setShowProfileMenu(!showProfileMenu); }}>
              {isLoggedIn ? userEmail.slice(0,2).toUpperCase() : 'UI'}
            </button>
            {isLoggedIn && showProfileMenu && (
              <div className="lang-dropdown" style={{right:0, left:'auto', width:'200px'}}>
                <div style={{padding:'10px', fontSize:'12px', color:'var(--neon-cyan)', borderBottom:'1px solid var(--border-subtle)', marginBottom:'5px'}}>{userEmail}</div>
                <button className="lang-item" onClick={() => {setShowProfileMenu(false); setShowHistory(true);}}>HISTORY LOG</button>
                <button className="lang-item" style={{color:'var(--neon-red)'}} onClick={handleLogout}>DISCONNECT</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="ide-body">
        
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sidebar-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="sidebar-search" type="text" placeholder="FILTER DIRECTORY..." value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} />
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>LOCAL_FS</span>
              <button className="sidebar-icon-btn" onClick={handleFilesUploadClick} title="Upload files">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M5 20h14"/></svg>
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept=".py,.java,.cpp,.cc,.c,.h,.txt" multiple className="hidden-file-input" onChange={handleFilesSelected} />
            <ul className="file-list">
              {!activeFileName && filteredFiles.length === 0 && (
                <li className="file-item-row">
                  <button className="file-btn active">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>{language === 'cpp' ? 'main.cpp' : language === 'python' ? 'main.py' : 'Main.java'}</span>
                  </button>
                </li>
              )}
              {filteredFiles.map(file => (
                <li key={file.name} className="file-item-row">
                  <button className={`file-btn ${activeFileName === file.name ? 'active' : ''}`} onClick={() => handleOpenProjectFile(file)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>{file.name}</span>
                  </button>
                  <button className="file-remove-btn" onClick={(e) => handleDeleteProjectFile(file.name, e)}>✕</button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* EDITOR */}
        <div className="editor-main">
          <div className="editor-tabs">
            <div className="editor-tab active">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {activeFileName ? activeFileName : (language === 'cpp' ? 'main.cpp' : language === 'python' ? 'main.py' : 'Main.java')}
            </div>
          </div>
          <div className="editor-wrap">
            <Editor
              height="100%"
              language={getMonacoLanguage()}
              value={code}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                fontSize: 15,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 15 },
                cursorBlinking: 'smooth',
                cursorWidth: 3,
                smoothScrolling: true
              }}
            />
          </div>

          {/* SPLIT I/O PANEL */}
          <div className={`bottom-panel ${bottomPanelCollapsed ? 'collapsed' : ''}`}>
            <div className="panel-tabs">
              <div className="panel-tab active">I/O TERMINAL</div>
              <div className="panel-tabs-spacer" />
              <button className="panel-collapse-btn" onClick={() => setBottomPanelCollapsed(p => !p)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={bottomPanelCollapsed ? 'rotated' : ''}><polyline points="18 15 12 9 6 15"/></svg>
              </button>
            </div>
            
            {!bottomPanelCollapsed && (
              <div className="io-container">
                <div className="io-box">
                  <div className="io-header">
                    <span>STDIN (INPUT)</span>
                  </div>
                  <textarea 
                    className="io-textarea" 
                    placeholder="Enter multi-line input here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    spellCheck="false"
                  />
                </div>
                
                <div className="io-box">
                  <div className="io-header">
                    <span>STDOUT (OUTPUT)</span>
                    {error && <span style={{color:'var(--neon-red)'}}>ERROR</span>}
                  </div>
                  <div className={`io-output-area ${error ? 'error' : output ? 'success' : ''}`}>
                    {isRunning ? (
                      <span className="running-text">AWAITING QUANTUM RESOLUTION...</span>
                    ) : (
                      output || (error ? error : "Ready for execution.")
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;