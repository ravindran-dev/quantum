import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './History.css';

const BACKEND_URL = 'http://localhost:5000';

const History = ({ userEmail, onClose, onLoadCode }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/api/history/${userEmail}`);
      setHistory(response.data.history || []);
      setError('');
    } catch (err) {
      setError('Failed to load history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryItem = async (id) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/history/${userEmail}/${id}`);
      setHistory(history.filter(item => item.id !== id));
    } catch (err) {
      setError('Failed to delete history item');
      console.error(err);
    }
  };

  const loadCodeFromHistory = (item) => {
    onLoadCode(item);
    onClose();
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLanguageColor = (lang) => {
    const colors = {
      cpp: '#00599C',
      python: '#3776AB',
      java: '#007396'
    };
    return colors[lang] || '#007acc';
  };

  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h2>Code History</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="history-content">
          {loading ? (
            <div className="history-loading">
              <div className="spinner"></div>
              <p>Loading history...</p>
            </div>
          ) : error ? (
            <div className="history-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <p>{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="history-empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
              </svg>
              <p>No code history yet</p>
              <span>Start coding and your work will be saved here</span>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-item-header">
                    <div className="history-item-info">
                      <span 
                        className="language-badge"
                        style={{ backgroundColor: getLanguageColor(item.language) }}
                      >
                        {item.language.toUpperCase()}
                      </span>
                      <span className="history-date">{formatDate(item.timestamp)}</span>
                    </div>
                    <div className="history-item-actions">
                      <button 
                        className="load-btn"
                        onClick={() => loadCodeFromHistory(item)}
                        title="Load this code"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        Load
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteHistoryItem(item.id)}
                        title="Delete this entry"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="history-blocks">
                    <div className="history-block code-block">
                      <div className="block-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                        </svg>
                        Code
                      </div>
                      <pre className="block-content">{item.code}</pre>
                    </div>

                    {item.input && (
                      <div className="history-block input-block">
                        <div className="block-label">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                          </svg>
                          Input
                        </div>
                        <pre className="block-content">{item.input}</pre>
                      </div>
                    )}

                    {item.output && (
                      <div className="history-block output-block">
                        <div className="block-label">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
                          </svg>
                          Output
                        </div>
                        <pre className="block-content">{item.output}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
