/**
 * Pulsar Extension v2.0 - Background Service Worker
 *
 * 職責：
 * 1. Native Messaging - 與 Native Host 通訊
 * 2. WebSocket - 連接後端 API
 * 3. Job Management - 管理任務佇列
 * 4. Notification - 使用者通知
 */

import { NativeMessaging } from './lib/native-messaging.js';
import { WebSocketClient } from './lib/websocket.js';
import { JobQueue } from './lib/job-queue.js';

const NATIVE_HOST_NAME = 'com.irisgo.pulsar';
const BACKEND_WS_URL = 'wss://pulsar.irisgo.xyz/ws';

class PulsarBackgroundService {
  constructor() {
    this.nativePort = null;
    this.wsClient = null;
    this.jobQueue = new JobQueue();
    this.isNativeHostConnected = false;
    this.isBackendConnected = false;
  }

  async init() {
    console.log('[Pulsar] Background service initializing...');

    // 1. 連接 Native Host
    await this.connectNativeHost();

    // 2. 取得使用者 token
    const token = await this.getAuthToken();

    if (token) {
      // 3. 連接 Backend WebSocket
      await this.connectBackend(token);
    }

    // 4. 設定監聽器
    this.setupListeners();

    // 5. 啟動心跳檢測
    this.startHeartbeat();

    console.log('[Pulsar] Background service ready');
  }

  async connectNativeHost() {
    try {
      this.nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

      this.nativePort.onMessage.addListener((message) => {
        this.handleNativeMessage(message);
      });

      this.nativePort.onDisconnect.addListener(() => {
        console.error('[Pulsar] Native Host disconnected:', chrome.runtime.lastError);
        this.isNativeHostConnected = false;
        this.showNotification('Native Host 已離線', '請重啟 Pulsar Native Host');

        // 嘗試重連
        setTimeout(() => this.connectNativeHost(), 5000);
      });

      // 測試連線
      const status = await this.sendNativeMessage({
        type: 'get_status',
        requestId: this.generateRequestId()
      });

      if (status) {
        this.isNativeHostConnected = true;
        console.log('[Pulsar] Native Host connected:', status);
      }

    } catch (error) {
      console.error('[Pulsar] Failed to connect Native Host:', error);
      this.showNotification(
        'Native Host 連線失敗',
        '請確認 Pulsar Native Host 已安裝並運行'
      );
    }
  }

  async connectBackend(token) {
    try {
      this.wsClient = new WebSocketClient(BACKEND_WS_URL, token);

      this.wsClient.on('open', () => {
        this.isBackendConnected = true;
        console.log('[Pulsar] Backend connected');
      });

      this.wsClient.on('message', (event, data) => {
        this.handleBackendMessage(event, data);
      });

      this.wsClient.on('close', () => {
        this.isBackendConnected = false;
        console.log('[Pulsar] Backend disconnected');
      });

      this.wsClient.on('error', (error) => {
        console.error('[Pulsar] Backend error:', error);
      });

      await this.wsClient.connect();

    } catch (error) {
      console.error('[Pulsar] Failed to connect Backend:', error);
    }
  }

  handleNativeMessage(message) {
    console.log('[Pulsar] Native message received:', message.type);

    switch (message.type) {
      case 'job_status':
        this.handleJobStatus(message.payload);
        break;

      case 'accounts_list':
        this.updateAccountsCache(message.payload.accounts);
        break;

      case 'status_report':
        this.updateSystemStatus(message.payload);
        break;

      case 'log_message':
        this.handleLogMessage(message.payload);
        break;

      case 'heartbeat_ack':
        this.lastHeartbeat = Date.now();
        break;

      default:
        console.warn('[Pulsar] Unknown native message type:', message.type);
    }
  }

  handleBackendMessage(event, data) {
    console.log('[Pulsar] Backend event received:', event);

    switch (event) {
      case 'job.created':
        this.handleNewJob(data);
        break;

      case 'job.cancelled':
        this.handleJobCancellation(data);
        break;

      case 'analytics.update':
        this.handleAnalyticsUpdate(data);
        break;

      default:
        console.warn('[Pulsar] Unknown backend event:', event);
    }
  }

  async handleNewJob(jobData) {
    console.log('[Pulsar] New job received:', jobData.jobId);

    // 加入本地佇列
    await this.jobQueue.add(jobData);

    // 檢查是否應立即執行
    const now = new Date();
    const scheduledAt = new Date(jobData.scheduledAt);

    if (scheduledAt <= now) {
      // 立即執行
      await this.executeJob(jobData);
    } else {
      // 排程執行
      const delay = scheduledAt - now;
      chrome.alarms.create(`job-${jobData.jobId}`, {
        when: scheduledAt.getTime()
      });
      console.log(`[Pulsar] Job scheduled in ${delay}ms`);
    }
  }

  async executeJob(jobData) {
    if (!this.isNativeHostConnected) {
      console.error('[Pulsar] Cannot execute job: Native Host offline');
      await this.reportJobFailed(jobData.jobId, 'Native Host offline');
      return;
    }

    console.log('[Pulsar] Executing job:', jobData.jobId);

    // 發送給 Native Host 執行
    const requestId = this.generateRequestId();
    await this.sendNativeMessage({
      type: 'execute_job',
      requestId,
      payload: {
        jobId: jobData.jobId,
        platform: jobData.platform,
        action: jobData.action,
        content: jobData.content,
        targetUrl: jobData.targetUrl,
        accountId: await this.getAccountId(jobData.platform),
        metadata: {
          personaId: jobData.personaId,
          generatedAt: jobData.createdAt,
          scheduledAt: jobData.scheduledAt
        }
      }
    });
  }

  async handleJobStatus(statusData) {
    console.log('[Pulsar] Job status update:', statusData.jobId, statusData.status);

    // 更新本地佇列
    await this.jobQueue.updateStatus(statusData.jobId, statusData);

    // 通知 Backend
    if (this.isBackendConnected) {
      this.wsClient.send('job.completed', {
        jobId: statusData.jobId,
        status: statusData.status,
        postUrl: statusData.postUrl,
        completedAt: statusData.completedAt,
        executionTime: statusData.executionTime,
        error: statusData.error
      });
    }

    // 顯示通知
    if (statusData.status === 'completed') {
      this.showNotification(
        '✅ 發文成功',
        `已發布到 ${statusData.platform || 'social media'}`
      );
    } else if (statusData.status === 'failed') {
      this.showNotification(
        '❌ 發文失敗',
        statusData.error?.message || '未知錯誤'
      );
    }
  }

  async handleJobCancellation(data) {
    console.log('[Pulsar] Job cancelled:', data.jobId);

    // 從本地佇列移除
    await this.jobQueue.remove(data.jobId);

    // 取消 alarm
    chrome.alarms.clear(`job-${data.jobId}`);

    // 通知 Native Host
    if (this.isNativeHostConnected) {
      await this.sendNativeMessage({
        type: 'cancel_job',
        requestId: this.generateRequestId(),
        payload: {
          jobId: data.jobId,
          reason: data.reason
        }
      });
    }
  }

  setupListeners() {
    // Alarm listener (排程任務)
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name.startsWith('job-')) {
        const jobId = alarm.name.replace('job-', '');
        const job = await this.jobQueue.get(jobId);
        if (job) {
          await this.executeJob(job);
        }
      }
    });

    // Extension message listener (來自 popup/options)
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleExtensionMessage(message, sender)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // 保持 async
    });
  }

  async handleExtensionMessage(message, sender) {
    console.log('[Pulsar] Extension message:', message.action);

    switch (message.action) {
      case 'get_status':
        return {
          nativeHostConnected: this.isNativeHostConnected,
          backendConnected: this.isBackendConnected,
          queueSize: await this.jobQueue.size(),
          lastHeartbeat: this.lastHeartbeat
        };

      case 'get_accounts':
        return await this.getAccounts();

      case 'execute_now':
        await this.executeJob(message.jobData);
        return { success: true };

      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  }

  startHeartbeat() {
    // 每 30 秒發送心跳給 Native Host
    setInterval(async () => {
      if (this.isNativeHostConnected) {
        await this.sendNativeMessage({
          type: 'heartbeat',
          requestId: this.generateRequestId()
        });
      }
    }, 30000);
  }

  async sendNativeMessage(message) {
    return new Promise((resolve, reject) => {
      if (!this.nativePort) {
        reject(new Error('Native Host not connected'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Native message timeout'));
      }, 10000);

      const listener = (response) => {
        if (response.requestId === message.requestId) {
          clearTimeout(timeoutId);
          this.nativePort.onMessage.removeListener(listener);
          resolve(response.payload);
        }
      };

      this.nativePort.onMessage.addListener(listener);
      this.nativePort.postMessage({
        ...message,
        timestamp: Date.now(),
        version: '1.0.0'
      });
    });
  }

  async getAuthToken() {
    const result = await chrome.storage.local.get('authToken');
    return result.authToken;
  }

  async getAccountId(platform) {
    const accounts = await this.getAccounts();
    const account = accounts.find(acc => acc.platform === platform && acc.isActive);
    return account?.id;
  }

  async getAccounts() {
    if (!this.isNativeHostConnected) {
      return [];
    }

    const response = await this.sendNativeMessage({
      type: 'get_accounts',
      requestId: this.generateRequestId()
    });

    return response.accounts || [];
  }

  async updateAccountsCache(accounts) {
    await chrome.storage.local.set({ accounts });
  }

  async updateSystemStatus(status) {
    await chrome.storage.local.set({ systemStatus: status });
  }

  handleLogMessage(logData) {
    const { level, message, context } = logData;
    console[level]?.(`[Native Host] ${message}`, context);
  }

  async reportJobFailed(jobId, errorMessage) {
    if (this.isBackendConnected) {
      this.wsClient.send('job.failed', {
        jobId,
        error: {
          code: 'NATIVE_HOST_OFFLINE',
          message: errorMessage
        }
      });
    }
  }

  showNotification(title, message) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message
    });
  }

  generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 初始化
const service = new PulsarBackgroundService();
service.init();
