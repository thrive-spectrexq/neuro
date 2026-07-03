chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract_content') {
    // Attempt to find the main article content, fallback to body text
    const article = document.querySelector('article');
    const main = document.querySelector('main');
    
    let content = '';
    if (article) {
      content = article.innerText;
    } else if (main) {
      content = main.innerText;
    } else {
      content = document.body.innerText;
    }
    
    // Clean up excessive whitespace
    content = content.replace(/\s+/g, ' ').trim();
    
    sendResponse({ content });
  }
  return true;
});
