// Pulsar Extension - Background Service Worker

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_COOKIES') {
    getCookiesForPlatform(request.platform).then(sendResponse);
    return true; // Keep channel open for async response
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
    }
    return [];
  } catch (err) {
    console.error('Error getting cookies:', err);
    return [];
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Pulsar Extension installed');
  } else if (details.reason === 'update') {
    console.log('Pulsar Extension updated');
  }
});
