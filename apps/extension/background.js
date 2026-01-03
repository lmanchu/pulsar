// Pulsar Extension - Background Service Worker
// Handles WebSocket connection and automated posting

// Configuration
const CONFIG = {
  serverUrl: 'https://pulsar.irisgo.xyz',
  wsReconnectDelay: 5000,
  postTimeout: 60000,
};

// State
let ws = null;
let connectionToken = null;
let isConnected = false;

// Initialize on extension load
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Pulsar] Extension installed/updated');
  initializeConnection();
});

// Also try to connect when service worker starts
chrome.runtime.onStartup.addListener(() => {
  console.log('[Pulsar] Browser started');
  initializeConnection();
});

// Initialize WebSocket connection
async function initializeConnection() {
  const stored = await chrome.storage.local.get(['connectionToken']);
  if (stored.connectionToken) {
    connectionToken = stored.connectionToken;
    connectWebSocket();
  } else {
    console.log('[Pulsar] No connection token, waiting for user to connect');
  }
}

// Connect to WebSocket server
function connectWebSocket() {
  if (!connectionToken) {
    console.log('[Pulsar] No token, cannot connect WebSocket');
    return;
  }

  const wsUrl = CONFIG.serverUrl.replace('https://', 'wss://').replace('http://', 'ws://');

  try {
    ws = new WebSocket(`${wsUrl}/api/extension/ws?token=${connectionToken}`);

    ws.onopen = () => {
      console.log('[Pulsar] WebSocket connected');
      isConnected = true;
      // Notify popup if open
      chrome.runtime.sendMessage({ type: 'WS_STATUS', connected: true }).catch(() => {});
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[Pulsar] Received message:', message.type);
        await handleServerMessage(message);
      } catch (err) {
        console.error('[Pulsar] Error handling message:', err);
      }
    };

    ws.onclose = () => {
      console.log('[Pulsar] WebSocket disconnected');
      isConnected = false;
      ws = null;
      chrome.runtime.sendMessage({ type: 'WS_STATUS', connected: false }).catch(() => {});

      // Reconnect after delay
      setTimeout(() => {
        if (connectionToken) connectWebSocket();
      }, CONFIG.wsReconnectDelay);
    };

    ws.onerror = (err) => {
      console.error('[Pulsar] WebSocket error:', err);
    };
  } catch (err) {
    console.error('[Pulsar] Failed to create WebSocket:', err);
    setTimeout(() => connectWebSocket(), CONFIG.wsReconnectDelay);
  }
}

// Handle messages from server
async function handleServerMessage(message) {
  switch (message.type) {
    case 'ping':
      sendToServer({ type: 'pong' });
      break;

    case 'post':
      await handlePostCommand(message);
      break;

    case 'reply':
      await handleReplyCommand(message);
      break;

    default:
      console.log('[Pulsar] Unknown message type:', message.type);
  }
}

// Send message to server
function sendToServer(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Handle post command from server
async function handlePostCommand(message) {
  const { jobId, platform, content } = message;
  console.log(`[Pulsar] Posting to ${platform} for job ${jobId}`);

  try {
    let result;
    if (platform === 'twitter') {
      result = await postToTwitter(content);
    } else if (platform === 'linkedin') {
      result = await postToLinkedIn(content);
    } else if (platform === 'threads') {
      result = await postToThreads(content);
    } else {
      throw new Error(`Unknown platform: ${platform}`);
    }

    sendToServer({
      type: 'post_result',
      jobId,
      success: true,
      postUrl: result.url,
    });
  } catch (err) {
    console.error('[Pulsar] Post failed:', err);
    sendToServer({
      type: 'post_result',
      jobId,
      success: false,
      error: err.message,
    });
  }
}

// Handle reply command from server
async function handleReplyCommand(message) {
  const { jobId, platform, content, targetUrl } = message;
  console.log(`[Pulsar] Replying on ${platform} for job ${jobId}`);

  try {
    let result;
    if (platform === 'twitter') {
      result = await replyToTwitter(targetUrl, content);
    } else if (platform === 'linkedin') {
      result = await replyToLinkedIn(targetUrl, content);
    } else if (platform === 'threads') {
      result = await replyToThreads(targetUrl, content);
    } else {
      throw new Error(`Unknown platform: ${platform}`);
    }

    sendToServer({
      type: 'post_result',
      jobId,
      success: true,
      postUrl: result.url,
    });
  } catch (err) {
    console.error('[Pulsar] Reply failed:', err);
    sendToServer({
      type: 'post_result',
      jobId,
      success: false,
      error: err.message,
    });
  }
}

// ==================== Twitter Posting ====================

async function postToTwitter(content) {
  const tab = await chrome.tabs.create({
    url: 'https://twitter.com/compose/tweet',
    active: false,
  });

  try {
    await waitForTabLoad(tab.id);
    await sleep(2000);

    // Type content
    await executeScript(tab.id, (text) => {
      const editor = document.querySelector('[data-testid="tweetTextarea_0"]');
      if (!editor) throw new Error('Tweet editor not found');
      editor.focus();
      document.execCommand('insertText', false, text);
    }, [content]);

    await sleep(1000);

    // Click post button
    await executeScript(tab.id, () => {
      const postBtn = document.querySelector('[data-testid="tweetButton"]');
      if (!postBtn) throw new Error('Post button not found');
      postBtn.click();
    });

    await sleep(3000);

    const finalUrl = await getTabUrl(tab.id);
    return { url: finalUrl };
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function replyToTwitter(targetUrl, content) {
  const tab = await chrome.tabs.create({
    url: targetUrl,
    active: false,
  });

  try {
    await waitForTabLoad(tab.id);
    await sleep(2000);

    // Click reply button
    await executeScript(tab.id, () => {
      const replyBtn = document.querySelector('[data-testid="reply"]');
      if (!replyBtn) throw new Error('Reply button not found');
      replyBtn.click();
    });

    await sleep(1000);

    // Type content
    await executeScript(tab.id, (text) => {
      const editor = document.querySelector('[data-testid="tweetTextarea_0"]');
      if (!editor) throw new Error('Reply editor not found');
      editor.focus();
      document.execCommand('insertText', false, text);
    }, [content]);

    await sleep(1000);

    // Click reply button
    await executeScript(tab.id, () => {
      const postBtn = document.querySelector('[data-testid="tweetButton"]');
      if (!postBtn) throw new Error('Reply button not found');
      postBtn.click();
    });

    await sleep(3000);

    const finalUrl = await getTabUrl(tab.id);
    return { url: finalUrl };
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// ==================== LinkedIn Posting ====================

async function postToLinkedIn(content) {
  const tab = await chrome.tabs.create({
    url: 'https://www.linkedin.com/feed/',
    active: false,
  });

  try {
    await waitForTabLoad(tab.id);
    await sleep(3000);

    // Click "Start a post" button
    await executeScript(tab.id, () => {
      // Try multiple selectors
      const selectors = [
        'button.share-box-feed-entry__trigger',
        '[aria-label="Start a post"]',
        '.share-box-feed-entry__top-bar button',
      ];

      for (const selector of selectors) {
        const btn = document.querySelector(selector);
        if (btn) {
          btn.click();
          return;
        }
      }
      throw new Error('Start a post button not found');
    });

    await sleep(2000);

    // Type content in editor
    await executeScript(tab.id, (text) => {
      const selectors = [
        '.ql-editor',
        '[data-placeholder="What do you want to talk about?"]',
        '[role="textbox"][contenteditable="true"]',
      ];

      for (const selector of selectors) {
        const editor = document.querySelector(selector);
        if (editor) {
          editor.focus();
          document.execCommand('insertText', false, text);
          return;
        }
      }
      throw new Error('Editor not found');
    }, [content]);

    await sleep(1000);

    // Click post button
    await executeScript(tab.id, () => {
      const selectors = [
        'button.share-actions__primary-action',
        '[aria-label="Post"]',
        'button[type="submit"]',
      ];

      for (const selector of selectors) {
        const btn = document.querySelector(selector);
        if (btn && !btn.disabled) {
          btn.click();
          return;
        }
      }
      throw new Error('Post button not found');
    });

    await sleep(5000);

    const finalUrl = await getTabUrl(tab.id);
    return { url: finalUrl };
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function replyToLinkedIn(targetUrl, content) {
  const tab = await chrome.tabs.create({
    url: targetUrl,
    active: false,
  });

  try {
    await waitForTabLoad(tab.id);
    await sleep(3000);

    // Click comment button
    await executeScript(tab.id, () => {
      const commentBtn = document.querySelector('[aria-label*="Comment"], [aria-label*="comment"]');
      if (!commentBtn) throw new Error('Comment button not found');
      commentBtn.click();
    });

    await sleep(1000);

    // Type comment
    await executeScript(tab.id, (text) => {
      const editor = document.querySelector('.comments-comment-box__form .ql-editor, [role="textbox"]');
      if (!editor) throw new Error('Comment editor not found');
      editor.focus();
      document.execCommand('insertText', false, text);
    }, [content]);

    await sleep(1000);

    // Submit comment
    await executeScript(tab.id, () => {
      const submitBtn = document.querySelector('.comments-comment-box__submit-button, button[type="submit"]');
      if (!submitBtn) throw new Error('Submit button not found');
      submitBtn.click();
    });

    await sleep(3000);

    const finalUrl = await getTabUrl(tab.id);
    return { url: finalUrl };
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// ==================== Threads Posting ====================

async function postToThreads(content) {
  // Threads uses React which prevents automated text input
  // Use manual mode: copy to clipboard and let user paste

  // Copy content to clipboard
  await chrome.offscreen?.createDocument?.({
    url: 'offscreen.html',
    reasons: ['CLIPBOARD'],
    justification: 'Copy content to clipboard for Threads posting',
  }).catch(() => {}); // Ignore if already exists or not supported

  // Use a background-compatible clipboard approach
  const copySuccess = await executeScriptInNewTab(content);

  // Open Threads in a new tab
  const tab = await chrome.tabs.create({
    url: 'https://www.threads.com/',
    active: true,
  });

  await waitForTabLoad(tab.id);
  await sleep(2000);

  // Click on the compose area to open the modal
  await executeScript(tab.id, () => {
    const buttons = document.querySelectorAll('div[role="button"], button');
    for (const btn of buttons) {
      const text = btn.textContent || '';
      if (text.includes('有什麼新鮮事') || text.includes("What's new") ||
          text.includes('新鮮事') || text.includes('Start a thread')) {
        btn.click();
        return;
      }
    }
    const textbox = document.querySelector('[role="textbox"]');
    if (textbox) textbox.click();
  });

  await sleep(1000);

  // Show instruction alert to user
  await executeScript(tab.id, (text) => {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        max-width: 400px;
        text-align: center;
      ">
        <div style="font-weight: bold; margin-bottom: 8px;">📋 Pulsar - 內容已複製</div>
        <div style="margin-bottom: 12px; opacity: 0.9;">請按 Cmd+V 貼上，然後點擊「發佈」</div>
        <div style="
          background: rgba(255,255,255,0.2);
          padding: 10px;
          border-radius: 8px;
          font-size: 12px;
          max-height: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
        ">${text.substring(0, 150)}${text.length > 150 ? '...' : ''}</div>
      </div>
    `;
    document.body.appendChild(toast);

    // Auto-remove after 15 seconds
    setTimeout(() => toast.remove(), 15000);
  }, [content]);

  // Return success - user will complete manually
  return { url: 'https://www.threads.com/', manual: true };
}

// Helper to copy text to clipboard using a temporary tab
async function executeScriptInNewTab(text) {
  const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
  try {
    await executeScript(tab.id, async (content) => {
      await navigator.clipboard.writeText(content);
    }, [text]);
    return true;
  } catch (e) {
    console.error('Failed to copy to clipboard:', e);
    return false;
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function replyToThreads(targetUrl, content) {
  // Threads uses React - use manual mode for replies too

  // Copy content to clipboard
  await executeScriptInNewTab(content);

  // Open the target thread
  const tab = await chrome.tabs.create({
    url: targetUrl,
    active: true,
  });

  await waitForTabLoad(tab.id);
  await sleep(2000);

  // Show instruction toast
  await executeScript(tab.id, (text) => {
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        max-width: 400px;
        text-align: center;
      ">
        <div style="font-weight: bold; margin-bottom: 8px;">📋 Pulsar - 回覆內容已複製</div>
        <div style="margin-bottom: 12px; opacity: 0.9;">點擊回覆框，按 Cmd+V 貼上，然後發佈</div>
        <div style="
          background: rgba(255,255,255,0.2);
          padding: 10px;
          border-radius: 8px;
          font-size: 12px;
          max-height: 100px;
          overflow: hidden;
        ">${text.substring(0, 150)}${text.length > 150 ? '...' : ''}</div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 15000);
  }, [content]);

  return { url: targetUrl, manual: true };
}

// ==================== Utilities ====================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForTabLoad(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout'));
    }, timeout);

    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function executeScript(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });

  if (results[0]?.error) {
    throw new Error(results[0].error.message);
  }

  return results[0]?.result;
}

async function getTabUrl(tabId) {
  const tab = await chrome.tabs.get(tabId);
  return tab.url;
}

// ==================== Message Handlers ====================

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_COOKIES') {
    getCookiesForPlatform(request.platform).then(sendResponse);
    return true;
  }

  if (request.type === 'UPDATE_TOKEN') {
    connectionToken = request.token;
    chrome.storage.local.set({ connectionToken: request.token });

    // Reconnect with new token
    if (ws) {
      ws.close();
    }
    connectWebSocket();
    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'GET_WS_STATUS') {
    sendResponse({ connected: isConnected });
    return true;
  }

  if (request.type === 'TEST_POST') {
    // For testing - post directly without WebSocket
    handlePostCommand({
      jobId: 'test',
      platform: request.platform,
      content: request.content,
    }).then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Get cookies for a specific platform
async function getCookiesForPlatform(platform) {
  try {
    if (platform === 'twitter') {
      const twitterCookies = await chrome.cookies.getAll({ domain: 'twitter.com' });
      const xCookies = await chrome.cookies.getAll({ domain: 'x.com' });
      return [...twitterCookies, ...xCookies];
    } else if (platform === 'linkedin') {
      return await chrome.cookies.getAll({ domain: '.linkedin.com' });
    } else if (platform === 'threads') {
      const threadsCom = await chrome.cookies.getAll({ domain: '.threads.com' });
      const threadsNet = await chrome.cookies.getAll({ domain: '.threads.net' });
      return [...threadsCom, ...threadsNet];
    }
    return [];
  } catch (err) {
    console.error('Error getting cookies:', err);
    return [];
  }
}

// Keep service worker alive
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('[Pulsar] Keep alive ping');
    if (!isConnected && connectionToken) {
      connectWebSocket();
    }
  }
});

// Initialize on load
initializeConnection();
