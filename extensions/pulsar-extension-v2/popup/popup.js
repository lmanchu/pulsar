/**
 * Pulsar Extension - Popup UI
 */

// DOM Elements
const nativeStatus = document.getElementById('native-status');
const backendStatus = document.getElementById('backend-status');
const pendingJobs = document.getElementById('pending-jobs');
const todayPosts = document.getElementById('today-posts');
const successRate = document.getElementById('success-rate');
const jobList = document.getElementById('job-list');
const postNowBtn = document.getElementById('post-now');
const viewQueueBtn = document.getElementById('view-queue');
const openSettingsBtn = document.getElementById('open-settings');

// Initialize
async function init() {
  await loadStatus();
  await loadJobs();
  setupEventListeners();
  startPolling();
}

async function loadStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'get_status' });

    // Update status indicators
    nativeStatus.classList.toggle('online', response.nativeHostConnected);
    backendStatus.classList.toggle('online', response.backendConnected);

    // Update stats
    pendingJobs.textContent = response.queueSize || 0;

  } catch (error) {
    console.error('Failed to load status:', error);
  }
}

async function loadJobs() {
  try {
    const result = await chrome.storage.local.get('jobQueue');
    const queue = result.jobQueue || [];

    if (queue.length === 0) {
      jobList.innerHTML = '<div class="empty-state">尚無任務</div>';
      return;
    }

    // Show recent 5 jobs
    const recentJobs = queue.slice(-5).reverse();

    jobList.innerHTML = recentJobs.map(job => `
      <div class="job-item ${job.status}">
        <div class="job-icon">${getPlatformIcon(job.platform)}</div>
        <div class="job-info">
          <div class="job-title">${truncate(job.content, 50)}</div>
          <div class="job-meta">${formatTime(job.scheduledAt)}</div>
        </div>
        <div class="job-status ${job.status}">${getStatusText(job.status)}</div>
      </div>
    `).join('');

    // Calculate stats
    const today = new Date().toISOString().split('T')[0];
    const todayJobs = queue.filter(j => j.completedAt?.startsWith(today));
    const completed = todayJobs.filter(j => j.status === 'completed');

    todayPosts.textContent = completed.length;
    successRate.textContent = todayJobs.length > 0
      ? Math.round((completed.length / todayJobs.length) * 100) + '%'
      : '-';

  } catch (error) {
    console.error('Failed to load jobs:', error);
  }
}

function setupEventListeners() {
  postNowBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'options/options.html#create-post' });
  });

  viewQueueBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'options/options.html#queue' });
  });

  openSettingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

function startPolling() {
  // Refresh every 5 seconds
  setInterval(() => {
    loadStatus();
    loadJobs();
  }, 5000);
}

// Helper functions
function getPlatformIcon(platform) {
  const icons = {
    twitter: '🐦',
    linkedin: '💼',
    threads: '🧵'
  };
  return icons[platform] || '📱';
}

function getStatusText(status) {
  const texts = {
    pending: '待處理',
    processing: '執行中',
    completed: '完成',
    failed: '失敗',
    cancelled: '已取消'
  };
  return texts[status] || status;
}

function truncate(text, maxLength) {
  if (!text) return '-';
  return text.length > maxLength
    ? text.substring(0, maxLength) + '...'
    : text;
}

function formatTime(timestamp) {
  if (!timestamp) return '-';

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '剛剛';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分鐘前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小時前';

  return date.toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Start
init();
