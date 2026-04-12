import React, { useState } from 'react';
import './Toolbar.css';
import logo from '../logoquantum.png';

const Toolbar = ({ 
  language, 
  onLanguageChange, 
  onRun, 
  isRunning, 
  userEmail, 
  isLoggedIn, 
  onLogin, 
  onSwitchAccount,
  onLogout,
  onShowHistory,
  saveStatus
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const languages = [
    { id: 'cpp', label: 'C++' },
    { id: 'python', label: 'Python' },
    { id: 'java', label: 'Java' }
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <img src={logo} alt="Quantum Logo" className="quantum-logo" />
        <h1 className="project-title">Quantum Compiler</h1>
      </div>

      <div className="toolbar-center">
        <div className="language-buttons">
          {languages.map(lang => (
            <button
              key={lang.id}
              className={`language-btn ${language === lang.id ? 'active' : ''}`}
              onClick={() => onLanguageChange(lang.id)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-right">
        {isLoggedIn && saveStatus && (
          <div className={`save-indicator ${saveStatus}`}>
            {saveStatus === 'saving' ? (
              <>
                <svg className="save-spinner" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Saved
              </>
            )}
          </div>
        )}

        <button
          className="run-btn"
          onClick={onRun}
          disabled={isRunning}
        >
          <svg className="play-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          {isRunning ? 'Running...' : 'Run'}
        </button>

        <div className="profile-container">
          {isLoggedIn ? (
            <>
              <button 
                className="profile-btn" 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                title={userEmail}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </button>
              {showProfileMenu && (
                <div className="profile-menu">
                  <div className="profile-email">{userEmail}</div>
                  <button className="menu-item" onClick={() => {
                    onShowHistory();
                    setShowProfileMenu(false);
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                    </svg>
                    History
                  </button>
                  <button className="menu-item" onClick={() => {
                    onSwitchAccount();
                    setShowProfileMenu(false);
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 17v2H2v-2s0-4 7-4 7 4 7 4m-3.5-9.5A3.5 3.5 0 1 0 9 11a3.5 3.5 0 0 0 3.5-3.5m3.44 5.5A5.32 5.32 0 0 1 18 17v2h4v-2s0-3.63-6.06-4M15 4a3.39 3.39 0 0 0-1.93.59 5 5 0 0 1 0 5.82A3.39 3.39 0 0 0 15 11a3.5 3.5 0 0 0 0-7"/>
                    </svg>
                    Switch Account
                  </button>
                  <button className="menu-item logout-item" onClick={() => {
                    onLogout();
                    setShowProfileMenu(false);
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </>
          ) : (
            <button className="login-btn" onClick={onLogin}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
              Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
