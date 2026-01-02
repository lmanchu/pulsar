// Pulsar Extension - Popup Script

const TWITTER_DOMAINS = ['twitter.com', 'x.com'];
const LINKEDIN_DOMAINS = ['linkedin.com', 'www.linkedin.com'];

// Required cookies for each platform
const TWITTER_COOKIES = ['auth_token', 'ct0'];
const LINKEDIN_COOKIES = ['li_at', 'JSESSIONID'];

// State
let twitterLoggedIn = false;
let linkedinLoggedIn = false;
let twitterCookies = [];
let linkedinCookies = [];
let wsConnected = false;

// DOM Elements
const wsStatus = document.getElementById('ws-status');
const twitterStatus = document.getElementById('twitter-status');
const linkedinStatus = document.getElementById('linkedin-status');
const serverUrlInput = document.getElementById('server-url');
const tokenInput = document.getElementById('connection-token');
const connectBtn = document.getElementById('connect-btn');
const checkBtn = document.getElementById('check-btn');
const messageDiv = document.getElementById('message');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved token (server URL is now hardcoded)
  const saved = await chrome.storage.local.get(['connectionToken']);
  if (saved.connectionToken) tokenInput.value = saved.connectionToken;

  // Check WebSocket status
  await checkWsStatus();

  // Check login status
  await checkLoginStatus();

  // Update button state
  updateConnectButton();
});

// Listen for WebSocket status updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'WS_STATUS') {
    updateWsStatus(message.connected);
  }
});

// Event listeners
tokenInput.addEventListener('input', () => {
  chrome.storage.local.set({ connectionToken: tokenInput.value });
  updateConnectButton();
});

connectBtn.addEventListener('click', connectAccounts);
checkBtn.addEventListener('click', async () => {
  await checkWsStatus();
  await checkLoginStatus();
});

// Check WebSocket connection status
async function checkWsStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_WS_STATUS' });
    updateWsStatus(response?.connected || false);
  } catch (err) {
    console.error('Error checking WS status:', err);
    updateWsStatus(false);
  }
}

// Update WebSocket status display
function updateWsStatus(connected) {
  wsConnected = connected;
  if (connected) {
    wsStatus.textContent = 'Connected';
    wsStatus.className = 'status-badge logged-in';
  } else {
    wsStatus.textContent = 'Disconnected';
    wsStatus.className = 'status-badge not-logged-in';
  }
}

// Check if user is logged into Twitter and LinkedIn
async function checkLoginStatus() {
  twitterStatus.textContent = 'Checking...';
  linkedinStatus.textContent = 'Checking...';
  twitterStatus.className = 'status-badge not-logged-in';
  linkedinStatus.className = 'status-badge not-logged-in';

  // Check Twitter
  try {
    const twitterCookieResults = await Promise.all(
      TWITTER_DOMAINS.flatMap(domain =>
        TWITTER_COOKIES.map(name =>
          chrome.cookies.get({ url: `https://${domain}`, name })
        )
      )
    );

    twitterCookies = twitterCookieResults.filter(c => c !== null);
    const hasAuthToken = twitterCookies.some(c => c.name === 'auth_token');
    const hasCt0 = twitterCookies.some(c => c.name === 'ct0');
    twitterLoggedIn = hasAuthToken && hasCt0;

    if (twitterLoggedIn) {
      twitterStatus.textContent = 'Logged In';
      twitterStatus.className = 'status-badge logged-in';
    } else {
      twitterStatus.textContent = 'Not Logged In';
      twitterStatus.className = 'status-badge not-logged-in';
    }
  } catch (err) {
    console.error('Error checking Twitter:', err);
    twitterStatus.textContent = 'Error';
  }

  // Check LinkedIn
  try {
    const linkedinCookieResults = await Promise.all(
      LINKEDIN_DOMAINS.flatMap(domain =>
        LINKEDIN_COOKIES.map(name =>
          chrome.cookies.get({ url: `https://${domain}`, name })
        )
      )
    );

    linkedinCookies = linkedinCookieResults.filter(c => c !== null);
    const hasLiAt = linkedinCookies.some(c => c.name === 'li_at');
    linkedinLoggedIn = hasLiAt;

    if (linkedinLoggedIn) {
      linkedinStatus.textContent = 'Logged In';
      linkedinStatus.className = 'status-badge logged-in';
    } else {
      linkedinStatus.textContent = 'Not Logged In';
      linkedinStatus.className = 'status-badge not-logged-in';
    }
  } catch (err) {
    console.error('Error checking LinkedIn:', err);
    linkedinStatus.textContent = 'Error';
  }

  updateConnectButton();
}

// Update connect button state
function updateConnectButton() {
  const hasToken = tokenInput.value.trim().length > 0;
  const hasLoggedIn = twitterLoggedIn || linkedinLoggedIn;

  connectBtn.disabled = !(hasToken && hasLoggedIn);

  if (!hasLoggedIn) {
    connectBtn.textContent = 'No Accounts Detected';
  } else {
    const accounts = [];
    if (twitterLoggedIn) accounts.push('Twitter');
    if (linkedinLoggedIn) accounts.push('LinkedIn');
    connectBtn.textContent = `Connect ${accounts.join(' & ')}`;
  }
}

// Connect accounts to Pulsar
async function connectAccounts() {
  const serverUrl = serverUrlInput.value.trim().replace(/\/$/, '');
  const token = tokenInput.value.trim();

  if (!token) {
    showMessage('Please enter your connection token', 'error');
    return;
  }

  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting...';

  try {
    const payload = {
      token,
      accounts: []
    };

    // Add Twitter cookies if logged in
    if (twitterLoggedIn && twitterCookies.length > 0) {
      // Get all Twitter cookies (including additional useful ones)
      const allTwitterCookies = await chrome.cookies.getAll({ domain: 'twitter.com' });
      const xCookies = await chrome.cookies.getAll({ domain: 'x.com' });

      const relevantCookies = [...allTwitterCookies, ...xCookies]
        .filter(c => ['auth_token', 'ct0', 'twid', 'personalization_id'].includes(c.name))
        .map(c => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          expires: c.expirationDate,
          httpOnly: c.httpOnly,
          secure: c.secure,
          sameSite: c.sameSite
        }));

      payload.accounts.push({
        platform: 'twitter',
        cookies: relevantCookies
      });
    }

    // Add LinkedIn cookies if logged in
    if (linkedinLoggedIn && linkedinCookies.length > 0) {
      const allLinkedinCookies = await chrome.cookies.getAll({ domain: '.linkedin.com' });

      const relevantCookies = allLinkedinCookies
        .filter(c => ['li_at', 'JSESSIONID', 'liap', 'li_mc'].includes(c.name))
        .map(c => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path,
          expires: c.expirationDate,
          httpOnly: c.httpOnly,
          secure: c.secure,
          sameSite: c.sameSite
        }));

      payload.accounts.push({
        platform: 'linkedin',
        cookies: relevantCookies
      });
    }

    if (payload.accounts.length === 0) {
      showMessage('No accounts to connect', 'error');
      updateConnectButton();
      return;
    }

    // Send to Pulsar server
    const response = await fetch(`${serverUrl}/api/social-accounts/extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      showMessage(`Successfully connected ${payload.accounts.length} account(s)!`, 'success');

      // Update token in background and reconnect WebSocket
      await chrome.runtime.sendMessage({ type: 'UPDATE_TOKEN', token });

      // Wait a moment and check WS status
      setTimeout(async () => {
        await checkWsStatus();
      }, 1000);
    } else {
      showMessage(result.error || 'Failed to connect', 'error');
    }
  } catch (err) {
    console.error('Connection error:', err);
    showMessage('Failed to connect. Check server URL.', 'error');
  }

  updateConnectButton();
}

// Show message
function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.classList.remove('hidden');

  setTimeout(() => {
    messageDiv.classList.add('hidden');
  }, 5000);
}
