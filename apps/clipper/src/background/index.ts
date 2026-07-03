chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-neuro',
    title: 'Save to Neuro',
    contexts: ['page', 'selection', 'link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-neuro') {
    let content = '';
    
    if (info.selectionText) {
      content = info.selectionText;
    } else if (tab?.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract_content' });
        if (response && response.content) {
          content = response.content;
        }
      } catch (err) {
        console.error('Could not get content from page', err);
      }
    }

    const payload = {
      url: info.linkUrl || info.pageUrl,
      title: tab?.title || 'Saved from Context Menu',
      content: content,
      tags: ['context-menu'],
      source: 'web_clipper'
    };

    try {
      const res = await fetch('http://localhost:8000/api/v1/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        console.log('Successfully saved to Neuro');
      }
    } catch (err) {
      console.error('Failed to save to Neuro backend', err);
    }
  }
});
