# Pulsar Native Messaging Protocol

> Extension ↔ Native Host 通訊協議規格

## 概述

Chrome Extension 與 Native Host 之間使用 [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging) 進行通訊。訊息格式為 JSON，遵循以下規範。

---

## 訊息格式

所有訊息遵循統一結構：

```typescript
interface Message {
  type: string;           // 訊息類型
  payload: any;           // 訊息內容
  requestId?: string;     // 請求 ID (用於配對 request/response)
  timestamp?: number;     // Unix timestamp (milliseconds)
  version?: string;       // 協議版本 (default: "1.0.0")
}
```

---

## 訊息類型

### 1. Job 執行相關

#### 1.1 `execute_job` - 執行自動化任務

**Direction:** Extension → Native Host

```typescript
{
  type: "execute_job",
  requestId: "req-abc123",
  payload: {
    jobId: string;              // Job 唯一識別碼
    platform: "twitter" | "linkedin" | "threads";
    action: "post" | "reply" | "comment" | "like" | "follow";
    content?: string;           // 發文/回覆內容
    targetUrl?: string;         // 回覆/留言的目標 URL
    accountId: string;          // 使用的帳號 ID
    metadata?: {
      personaId?: string;
      generatedAt?: string;
      scheduledAt?: string;
      retryCount?: number;
    }
  }
}
```

**範例：**
```json
{
  "type": "execute_job",
  "requestId": "req-001",
  "payload": {
    "jobId": "job-123",
    "platform": "twitter",
    "action": "post",
    "content": "Excited to announce our new AI-powered social media tool! 🚀\n\n#AI #SocialMedia #Automation",
    "accountId": "account-twitter-lman",
    "metadata": {
      "personaId": "persona-tech-expert",
      "generatedAt": "2026-01-11T10:00:00Z",
      "scheduledAt": "2026-01-11T14:00:00Z"
    }
  }
}
```

#### 1.2 `job_status` - Job 狀態更新

**Direction:** Native Host → Extension

```typescript
{
  type: "job_status",
  requestId: "req-abc123",  // 對應的 execute_job requestId
  payload: {
    jobId: string;
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    progress?: number;        // 0-100
    message?: string;         // 狀態訊息
    postUrl?: string;         // 發文成功後的 URL
    error?: {
      code: string;
      message: string;
      details?: any;
    };
    completedAt?: string;     // ISO 8601 timestamp
    executionTime?: number;   // 執行時間 (ms)
  }
}
```

**範例：**
```json
{
  "type": "job_status",
  "requestId": "req-001",
  "payload": {
    "jobId": "job-123",
    "status": "completed",
    "postUrl": "https://twitter.com/lmanchu/status/1234567890",
    "completedAt": "2026-01-11T14:01:23Z",
    "executionTime": 2345
  }
}
```

#### 1.3 `cancel_job` - 取消 Job

**Direction:** Extension → Native Host

```typescript
{
  type: "cancel_job",
  requestId: "req-xyz789",
  payload: {
    jobId: string;
    reason?: string;
  }
}
```

---

### 2. 帳號管理相關

#### 2.1 `get_accounts` - 取得帳號列表

**Direction:** Extension → Native Host

```typescript
{
  type: "get_accounts",
  requestId: "req-def456",
  payload: {
    platform?: "twitter" | "linkedin" | "threads";  // 選填，篩選平台
  }
}
```

#### 2.2 `accounts_list` - 帳號列表回應

**Direction:** Native Host → Extension

```typescript
{
  type: "accounts_list",
  requestId: "req-def456",
  payload: {
    accounts: Array<{
      id: string;
      platform: "twitter" | "linkedin" | "threads";
      username: string;
      displayName?: string;
      isActive: boolean;
      isLoggedIn: boolean;
      lastUsed?: string;       // ISO 8601 timestamp
      avatar?: string;         // URL
    }>
  }
}
```

**範例：**
```json
{
  "type": "accounts_list",
  "requestId": "req-002",
  "payload": {
    "accounts": [
      {
        "id": "account-twitter-lman",
        "platform": "twitter",
        "username": "@lmanchu",
        "displayName": "Lman",
        "isActive": true,
        "isLoggedIn": true,
        "lastUsed": "2026-01-11T09:30:00Z",
        "avatar": "https://pbs.twimg.com/profile_images/..."
      },
      {
        "id": "account-linkedin-lman",
        "platform": "linkedin",
        "username": "lman-chu",
        "displayName": "Lman Chu",
        "isActive": true,
        "isLoggedIn": false,
        "lastUsed": "2026-01-10T15:20:00Z"
      }
    ]
  }
}
```

#### 2.3 `add_account` - 新增帳號

**Direction:** Extension → Native Host

```typescript
{
  type: "add_account",
  requestId: "req-ghi789",
  payload: {
    platform: "twitter" | "linkedin" | "threads";
    authMethod: "credentials" | "cookies";
    credentials?: {
      username: string;
      password: string;
      email?: string;
    };
    cookies?: Array<{
      name: string;
      value: string;
      domain: string;
      path?: string;
      expires?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "Strict" | "Lax" | "None";
    }>;
  }
}
```

#### 2.4 `account_added` - 帳號新增結果

**Direction:** Native Host → Extension

```typescript
{
  type: "account_added",
  requestId: "req-ghi789",
  payload: {
    success: boolean;
    accountId?: string;
    error?: {
      code: string;
      message: string;
    }
  }
}
```

#### 2.5 `remove_account` - 移除帳號

**Direction:** Extension → Native Host

```typescript
{
  type: "remove_account",
  requestId: "req-jkl012",
  payload: {
    accountId: string;
  }
}
```

---

### 3. 系統狀態相關

#### 3.1 `get_status` - 取得系統狀態

**Direction:** Extension → Native Host

```typescript
{
  type: "get_status",
  requestId: "req-mno345"
}
```

#### 3.2 `status_report` - 系統狀態回應

**Direction:** Native Host → Extension

```typescript
{
  type: "status_report",
  requestId: "req-mno345",
  payload: {
    version: string;           // Native Host 版本
    isRunning: boolean;
    queueSize: number;         // 待處理 jobs 數量
    activeJobs: number;        // 執行中 jobs 數量
    browserInstances: number;  // 活躍的 browser instances
    lastError?: {
      timestamp: string;
      message: string;
    };
    stats: {
      totalJobsToday: number;
      successfulJobsToday: number;
      failedJobsToday: number;
    }
  }
}
```

**範例：**
```json
{
  "type": "status_report",
  "requestId": "req-003",
  "payload": {
    "version": "2.0.0-beta.1",
    "isRunning": true,
    "queueSize": 3,
    "activeJobs": 1,
    "browserInstances": 2,
    "stats": {
      "totalJobsToday": 47,
      "successfulJobsToday": 45,
      "failedJobsToday": 2
    }
  }
}
```

#### 3.3 `heartbeat` - 心跳檢測

**Direction:** Extension → Native Host (每 30 秒)

```typescript
{
  type: "heartbeat",
  requestId: "req-heartbeat-001"
}
```

**Direction:** Native Host → Extension

```typescript
{
  type: "heartbeat_ack",
  requestId: "req-heartbeat-001",
  payload: {
    timestamp: number;
  }
}
```

---

### 4. 日誌與除錯

#### 4.1 `log_message` - 日誌訊息

**Direction:** Native Host → Extension

```typescript
{
  type: "log_message",
  payload: {
    level: "debug" | "info" | "warn" | "error";
    message: string;
    context?: {
      jobId?: string;
      accountId?: string;
      platform?: string;
    };
    timestamp: string;
  }
}
```

**範例：**
```json
{
  "type": "log_message",
  "payload": {
    "level": "info",
    "message": "Successfully posted to Twitter",
    "context": {
      "jobId": "job-123",
      "accountId": "account-twitter-lman",
      "platform": "twitter"
    },
    "timestamp": "2026-01-11T14:01:23.456Z"
  }
}
```

---

## 錯誤處理

### 錯誤代碼

| Code | 說明 | 處理方式 |
|------|------|----------|
| `AUTH_FAILED` | 帳號登入失敗 | 提示使用者重新設定憑證 |
| `RATE_LIMITED` | 平台速率限制 | 延遲重試 |
| `NETWORK_ERROR` | 網路錯誤 | 重試 3 次 |
| `INVALID_CONTENT` | 內容不符合平台規範 | 通知使用者修改內容 |
| `ACCOUNT_SUSPENDED` | 帳號被停權 | 標記帳號為不可用 |
| `BROWSER_CRASHED` | Browser process 崩潰 | 重啟 browser 並重試 |
| `UNKNOWN_ERROR` | 未知錯誤 | 記錄日誌並通知開發者 |

### 錯誤回應格式

```typescript
{
  type: "job_status",
  requestId: "req-001",
  payload: {
    jobId: "job-123",
    status: "failed",
    error: {
      code: "AUTH_FAILED",
      message: "Twitter login failed: Invalid credentials",
      details: {
        attemptCount: 3,
        lastAttempt: "2026-01-11T14:05:00Z",
        suggestedAction: "Please re-enter your Twitter credentials"
      }
    }
  }
}
```

---

## 安全性

### 1. 憑證傳輸

憑證在 Extension → Native Host 傳輸時必須加密：

```typescript
{
  type: "add_account",
  payload: {
    platform: "twitter",
    authMethod: "credentials",
    credentials: {
      // 使用 AES-256-GCM 加密
      encrypted: "a1b2c3d4...",
      iv: "xyz123...",
      authTag: "def456..."
    }
  }
}
```

### 2. 訊息驗證

所有訊息包含 timestamp，Native Host 應拒絕超過 60 秒的訊息：

```javascript
const now = Date.now();
const messageTime = message.timestamp;

if (now - messageTime > 60000) {
  throw new Error('Message too old, possible replay attack');
}
```

### 3. Request ID

使用 UUID v4 作為 requestId，確保唯一性：

```javascript
import { v4 as uuidv4 } from 'uuid';

const requestId = uuidv4(); // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

---

## 通訊流程範例

### 範例 1: 執行發文任務

```
Extension                           Native Host
    |                                    |
    |  1. execute_job (req-001)         |
    |----------------------------------->|
    |                                    |  2. 驗證 requestId
    |                                    |  3. 檢查 account 是否存在
    |                                    |  4. 解密憑證
    |  5. job_status (processing)        |
    |<-----------------------------------|
    |                                    |  6. 啟動 Puppeteer
    |                                    |  7. 登入 Twitter
    |                                    |  8. 撰寫推文
    |                                    |  9. 點擊發布
    |  10. job_status (completed)        |
    |<-----------------------------------|
    |                                    |
    |  11. 更新 UI                        |
    |  12. 通知 Backend via WebSocket    |
    |                                    |
```

### 範例 2: 心跳檢測

```
Extension                           Native Host
    |                                    |
    |  heartbeat (req-hb-001)           |
    |----------------------------------->|
    |                                    |
    |  heartbeat_ack                     |
    |<-----------------------------------|
    |                                    |
    ... (30 秒後) ...
    |                                    |
    |  heartbeat (req-hb-002)           |
    |----------------------------------->|
    |                                    |
    |  (無回應 - timeout)                |
    |                                    |
    |  顯示 "Native Host offline"        |
    |  提示使用者重啟 Native Host        |
    |                                    |
```

---

## 版本控制

協議版本遵循 [Semantic Versioning](https://semver.org/)：

- **v1.0.0**: 初始版本 (POC)
- **v1.1.0**: 加入 `cancel_job` 功能
- **v1.2.0**: 加入 LinkedIn 支援
- **v2.0.0**: 重大變更 - 修改憑證加密方式

Extension 和 Native Host 應檢查版本相容性：

```typescript
const PROTOCOL_VERSION = "1.0.0";

if (message.version !== PROTOCOL_VERSION) {
  throw new Error(
    `Protocol version mismatch: Extension(${PROTOCOL_VERSION}) != Native Host(${message.version})`
  );
}
```

---

## 測試工具

### 手動測試

使用 `native-messaging-test.js` 測試訊息：

```javascript
// Extension 端
const port = chrome.runtime.connectNative('com.irisgo.pulsar');

// 發送測試訊息
port.postMessage({
  type: "get_status",
  requestId: "test-001"
});

// 監聽回應
port.onMessage.addListener((message) => {
  console.log('Received:', message);
});
```

### 自動化測試

```bash
# Native Host 端單元測試
npm test -- protocol.test.js

# 整合測試
npm run test:integration
```

---

## 附錄

### A. Chrome Native Messaging 設定

**manifest.json (Extension)**
```json
{
  "name": "Pulsar",
  "version": "2.0.0",
  "manifest_version": 3,
  "permissions": [
    "nativeMessaging"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

**com.irisgo.pulsar.json (Native Host manifest - macOS)**
```json
{
  "name": "com.irisgo.pulsar",
  "description": "Pulsar Native Host",
  "path": "/Applications/Pulsar.app/Contents/MacOS/native-host",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://abcdefghijklmnopqrstuvwxyz123456/"
  ]
}
```

**安裝路徑：**
- macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.irisgo.pulsar.json`
- Windows: `HKEY_CURRENT_USER\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.irisgo.pulsar`

### B. 訊息大小限制

Chrome Native Messaging 訊息大小限制為 **1MB**。如需傳輸大型資料（如圖片），應使用以下策略：

1. 壓縮資料
2. 分割為多個訊息
3. 使用檔案系統 + 傳送檔案路徑

---

**協議版本：** v1.0.0
**最後更新：** 2026-01-11
**狀態：** 🚧 草案階段
