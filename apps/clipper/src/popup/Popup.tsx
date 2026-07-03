import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:8000/api/v1/ingest';

const Popup = () => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [content, setContent] = useState('');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab) {
        setUrl(activeTab.url || '');
        setTitle(activeTab.title || '');
        
        if (activeTab.id) {
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: 'extract_content' },
            (response) => {
              if (response && response.content) {
                setContent(response.content);
              }
            }
          );
        }
      }
    });
  }, []);

  const handleSave = async () => {
    setStatus('loading');
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          title,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          source: 'web_clipper'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      setStatus('success');
      setTimeout(() => window.close(), 2000);
    } catch (error) {
      console.error('Error saving to Neuro:', error);
      setStatus('error');
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ margin: 0, color: '#9d4edd', fontSize: '20px' }}>Neuro Clipper</h2>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: '#aaa' }}>Title</label>
        <input 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #333', background: '#1e1e1e', color: '#fff' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: '#aaa' }}>URL</label>
        <input 
          value={url} 
          disabled
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #333', background: '#1e1e1e', color: '#aaa' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: '#aaa' }}>Tags (comma separated)</label>
        <input 
          value={tags} 
          onChange={e => setTags(e.target.value)} 
          placeholder="e.g. ai, productivity, research"
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #333', background: '#1e1e1e', color: '#fff' }}
        />
      </div>

      <button 
        onClick={handleSave}
        disabled={status === 'loading' || status === 'success'}
        style={{ 
          padding: '10px', 
          borderRadius: '4px', 
          border: 'none', 
          background: status === 'success' ? '#2e7d32' : '#9d4edd', 
          color: '#fff', 
          fontWeight: 'bold',
          cursor: 'pointer',
          marginTop: '8px'
        }}
      >
        {status === 'loading' ? 'Saving...' : status === 'success' ? 'Saved!' : 'Save to Neuro'}
      </button>

      {status === 'error' && (
        <div style={{ color: '#d32f2f', fontSize: '12px', marginTop: '4px' }}>
          Failed to save. Ensure Neuro backend is running on port 8000.
        </div>
      )}
    </div>
  );
};

export default Popup;
