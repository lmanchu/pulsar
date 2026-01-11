# Pulsar v2.0 Architecture - Client-Side Automation

> **架構演進：** 從集中式後端自動化轉變為客戶端混合架構

## 概述

Pulsar v2.0 採用創新的混合架構，將 browser automation 從後端移至客戶端，同時保留 AI content generation 和 job scheduling 在雲端。這種架構提供：

- 🔒 **隱私優先**：使用者憑證永不離開本機
- 💰 **成本效益**：降低後端 browser pool 維護成本
- 🌍 **IP 分散**：每個使用者用自己的 IP，降低 rate limit 風險
- 📈 **可擴展性**：使用者數量增長不受後端資源限制

---

## 系統架構

```
┌────────────────────────────────────────────────────────────────┐
│                       使用者端 (Client)                          │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐        ┌─────────────────────────────┐  │
│  │ Chrome Extension │ ◄────► │  Native Host (Electron)     │  │
│  │                  │  Native │                             │  │
│  │ - UI Dashboard   │Messaging│ - Puppeteer Automation      │  │
│  │ - Job Receiver   │         │ - Credential Manager        │  │
│  │ - Status Monitor │         │ - Local Job Queue           │  │
│  │ - Settings       │         │ - Background Service        │  │
│  └──────────────────┘         └─────────────────────────────┘  │
│           │                              │                      │
│           │ WebSocket                    │ HTTP                │
│           ▼                              ▼                      │
└───────────┼──────────────────────────────┼──────────────────────┘
            │                              │
            │                              │
┌───────────┼──────────────────────────────┼──────────────────────┐
│           │        IrisGo Backend        │                      │
├───────────┴──────────────────────────────┴──────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │  Next.js API     │    │  AI Engine       │                  │
│  │                  │    │                  │                  │
│  │ - WebSocket      │    │ - Claude API     │                  │
│  │ - Job Scheduler  │    │ - Gemini API     │                  │
│  │ - User Auth      │    │ - Content Gen    │                  │
│  │ - Analytics      │    │ - Persona Engine │                  │
│  └──────────────────┘    └──────────────────┘                  │
│           │                       │                             │
│           ▼                       ▼                             │
│  ┌─────────────────────────────────────────┐                   │
│  │      Supabase (PostgreSQL)              │                   │
│  │                                          │                   │
│  │ - Users & Auth                           │                   │
│  │ - Personas                               │                   │
│  │ - Content Jobs                           │                   │
│  │ - Analytics Data                         │                   │
│  │ - ❌ NO Credentials Storage              │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 核心組件

### 1. Chrome Extension

**技術棧：**
- React 19 + Tailwind CSS
- Chrome Extension Manifest V3
- WebSocket client
- IndexedDB for local storage

**功能：**
```javascript
// Extension 主要職責
{
  "UI": {
    "Popup": "快速儀表板與設定",
    "Options Page": "完整設定頁面",
    "Side Panel": "內容預覽與編輯"
  },

  "Communication": {
    "Native Messaging": "與 Native Host 雙向通訊",
    "WebSocket": "接收後端 job instructions",
    "Chrome Storage": "本地設定與快取"
  },

  "Features": {
    "Job Receiver": "接收並轉發 jobs 給 Native Host",
    "Status Monitor": "顯示自動化執行狀態",
    "Credential Manager": "安全儲存憑證（加密）",
    "Manual Override": "手動觸發發文/回覆"
  }
}
```

**檔案結構：**
```
pulsar-extension/
├── manifest.json           # Manifest V3 設定
├── background.js           # Service Worker
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
├── lib/
│   ├── native-messaging.js # Native Host 通訊
│   ├── websocket.js        # Backend 連線
│   └── crypto.js           # 憑證加密
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

### 2. Native Host (Electron App)

**技術棧：**
- Electron 或 Tauri
- Puppeteer for browser automation
- Node.js backend

**功能：**
```javascript
// Native Host 主要職責
{
  "Automation": {
    "Twitter": "發文、回覆、追蹤",
    "LinkedIn": "發文、留言、連結",
    "Threads": "發文、回覆"
  },

  "Credential Management": {
    "Encryption": "AES-256-GCM 加密",
    "Storage": "系統 Keychain integration",
    "Session Cookies": "自動登入管理"
  },

  "Job Queue": {
    "Local Queue": "SQLite 本地佇列",
    "Retry Logic": "失敗重試機制",
    "Rate Limiting": "平台速率控制"
  },

  "Background Service": {
    "System Tray": "常駐系統列",
    "Auto Start": "開機自動啟動",
    "Scheduled Jobs": "定時任務執行"
  }
}
```

**檔案結構：**
```
pulsar-native-host/
├── package.json
├── main.js                 # Electron main process
├── preload.js              # Electron preload script
├── native-messaging/
│   ├── host.js             # Native Messaging server
│   └── protocol.js         # 通訊協議定義
├── automation/
│   ├── twitter.js          # Twitter automation
│   ├── linkedin.js         # LinkedIn automation
│   └── threads.js          # Threads automation
├── queue/
│   ├── job-queue.js        # 本地 job queue
│   └── scheduler.js        # 排程器
├── security/
│   ├── credential-manager.js
│   └── encryption.js
└── ui/
    ├── index.html          # 設定視窗
    └── tray.js             # 系統列介面
```

---

### 3. Backend API (pulsar.irisgo.xyz)

**技術棧：**
- Next.js 15 API Routes
- Supabase (PostgreSQL)
- WebSocket server (ws)
- Claude/Gemini API

**功能：**
```javascript
// Backend API 職責
{
  "API Routes": {
    "/api/auth": "使用者認證",
    "/api/personas": "Persona 管理",
    "/api/jobs": "Job 建立與查詢",
    "/api/analytics": "使用統計",
    "/api/content/generate": "AI 內容生成"
  },

  "WebSocket": {
    "/ws": "即時 job 推送給 Extension",
    "Events": ["job.created", "job.cancelled", "analytics.update"]
  },

  "AI Services": {
    "Content Generation": "使用 Claude/Gemini 生成內容",
    "Persona Engine": "根據 persona 調整語氣",
    "Reply Analysis": "分析目標內容並生成回覆"
  }
}
```

---

## 通訊協議

### Native Messaging Protocol

Extension ↔ Native Host 使用 Chrome Native Messaging：

```json
// Extension → Native Host: 執行 Job
{
  "type": "execute_job",
  "payload": {
    "jobId": "job-123",
    "platform": "twitter",
    "action": "post",
    "content": "Hello world! 🚀",
    "accountId": "account-456",
    "metadata": {
      "personaId": "persona-789",
      "generatedAt": "2026-01-11T10:00:00Z"
    }
  }
}

// Native Host → Extension: Job 狀態更新
{
  "type": "job_status",
  "payload": {
    "jobId": "job-123",
    "status": "completed",
    "postUrl": "https://twitter.com/user/status/123",
    "completedAt": "2026-01-11T10:01:23Z"
  }
}

// Extension → Native Host: 取得憑證狀態
{
  "type": "get_accounts",
  "payload": {}
}

// Native Host → Extension: 憑證列表
{
  "type": "accounts_list",
  "payload": {
    "accounts": [
      {
        "id": "account-456",
        "platform": "twitter",
        "username": "@lmanchu",
        "isActive": true,
        "lastUsed": "2026-01-11T09:30:00Z"
      }
    ]
  }
}
```

### WebSocket Protocol

Backend ↔ Extension 使用 WebSocket：

```json
// Backend → Extension: 新 Job 通知
{
  "event": "job.created",
  "data": {
    "jobId": "job-123",
    "userId": "user-456",
    "platform": "twitter",
    "action": "post",
    "content": "AI generated content here...",
    "scheduledAt": "2026-01-11T14:00:00Z",
    "personaId": "persona-789"
  }
}

// Extension → Backend: Job 完成報告
{
  "event": "job.completed",
  "data": {
    "jobId": "job-123",
    "status": "completed",
    "postUrl": "https://twitter.com/user/status/123",
    "completedAt": "2026-01-11T10:01:23Z",
    "metadata": {
      "executionTime": 2300,
      "retries": 0
    }
  }
}

// Backend → Extension: Job 取消
{
  "event": "job.cancelled",
  "data": {
    "jobId": "job-123",
    "reason": "User cancelled"
  }
}
```

---

## 安全性設計

### 憑證管理

```javascript
// 1. Extension 端加密憑證
import { encryptCredentials } from './lib/crypto.js';

const credentials = {
  username: 'user@example.com',
  password: 'secret123'
};

// 使用使用者 master password 加密
const encrypted = await encryptCredentials(credentials, masterPassword);

// 儲存到 chrome.storage.local (加密後)
await chrome.storage.local.set({ credentials: encrypted });

// 2. Native Host 解密並使用
// Extension 傳送加密憑證 + session key 給 Native Host
// Native Host 只在記憶體中解密，不寫入檔案

// 3. 永不傳送到後端
// ❌ 絕不傳送憑證到 pulsar.irisgo.xyz
// ✅ 只傳送 accountId 參考
```

### 資料隔離

```javascript
// Extension Storage (chrome.storage.local)
{
  "credentials": {
    "twitter": "encrypted_data",
    "linkedin": "encrypted_data"
  },
  "settings": {
    "autoStart": true,
    "notificationsEnabled": true
  }
}

// Native Host Storage (SQLite)
{
  "job_queue": [
    { "jobId": "job-123", "status": "pending", "data": {...} }
  ],
  "session_cookies": {
    "twitter": "encrypted_cookies"
  }
}

// Backend Database (Supabase)
{
  "users": { "id": "user-456", "email": "user@example.com" },
  "personas": { "id": "persona-789", "name": "Tech Expert" },
  "content_jobs": {
    "id": "job-123",
    "userId": "user-456",
    "platform": "twitter",
    "generatedContent": "Hello world!",
    "status": "pending",
    // ❌ NO credentials
    // ❌ NO passwords
    // ❌ NO cookies
  }
}
```

---

## 工作流程範例

### 1. 使用者設定 Persona

```
User → Extension Popup → WebSocket → Backend API
                                        ↓
                              Create Persona in DB
                                        ↓
                              Return personaId to Extension
```

### 2. 排程發文

```
User → Extension "Schedule Post"
         ↓
       WebSocket → Backend API
                     ↓
              AI Content Generation (Claude/Gemini)
                     ↓
              Create Job in DB (status: pending, scheduledAt: future)
                     ↓
       WebSocket ← Backend (job.created event)
         ↓
    Extension receives job
         ↓
    Store in local cache
         ↓
    Wait until scheduledAt
         ↓
    Native Messaging → Native Host "execute_job"
                          ↓
                    Puppeteer Automation
                          ↓
                    Post to Twitter/LinkedIn
                          ↓
    Native Messaging ← "job_status: completed"
         ↓
    Extension updates UI
         ↓
    WebSocket → Backend "job.completed"
                  ↓
           Update DB & Analytics
```

### 3. AI 自動回覆

```
Backend Cron Job (每小時)
  ↓
Query tracked accounts for new posts
  ↓
AI analyzes posts and generates replies
  ↓
Create reply jobs in DB
  ↓
WebSocket → Extension (multiple job.created events)
              ↓
         Extension receives jobs
              ↓
         Native Messaging → Native Host (batch execute)
                              ↓
                        Puppeteer replies to posts
                              ↓
         Native Messaging ← "job_status: completed" (x N)
              ↓
         WebSocket → Backend (bulk job.completed)
```

---

## 部署策略

### Phase 1: POC (本月)

**目標：** 驗證技術可行性

```bash
# 1. 建立 Native Host (Electron)
cd pulsar-native-host
npm init -y
npm install electron puppeteer

# 2. 更新 Extension
cd pulsar-extension
# 加入 Native Messaging 支援

# 3. 測試流程
# - Extension 與 Native Host 通訊
# - Native Host 執行 Twitter 發文
# - 回報狀態給 Extension
```

**成功指標：**
- ✅ Extension 成功連接 Native Host
- ✅ Native Host 成功執行 Puppeteer automation
- ✅ 端到端發文流程完成

### Phase 2: Alpha (下個月)

**目標：** 小範圍測試

```bash
# 1. 整合 Backend WebSocket
# 2. 實作 AI content generation
# 3. 加入 job scheduling
# 4. 5-10 位內部測試使用者
```

**成功指標：**
- ✅ 多平台支援 (Twitter + LinkedIn)
- ✅ 排程功能穩定運作
- ✅ 無憑證洩漏問題

### Phase 3: Beta (2 個月後)

**目標：** 公開測試

```bash
# 1. 發布 Extension 到 Chrome Web Store (private listing)
# 2. 提供 Native Host 安裝包 (macOS + Windows)
# 3. 50-100 位外部測試使用者
# 4. 收集回饋並優化
```

**成功指標：**
- ✅ 安裝流程順暢
- ✅ 7 天保留率 > 60%
- ✅ 平均每日發文數 > 3

### Phase 4: Production (3 個月後)

**目標：** 正式上線

```bash
# 1. Chrome Web Store 公開發布
# 2. 建立官網和文件
# 3. 付費訂閱系統
# 4. 客戶支援系統
```

---

## 技術債務與風險

### 已知風險

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| Chrome Extension 審核被拒 | 高 | 詳細說明用途 + 開源部分程式碼 |
| Native Host 安裝複雜 | 中 | 提供一鍵安裝包 (Electron Builder) |
| 平台 API 變更 | 中 | Puppeteer 保持更新 + 快速修復機制 |
| 使用者電腦關機 | 低 | Fallback 到 Backend browser pool (付費方案) |
| 憑證儲存安全性 | 高 | 使用系統 Keychain + 加密 |

### 技術選擇

| 決策 | 選項 A | 選項 B | 選擇 | 原因 |
|------|--------|--------|------|------|
| Desktop App | Electron | Tauri | **Electron** | 生態系統成熟 + Puppeteer 整合容易 |
| Extension Framework | Vanilla JS | React | **React** | 開發效率高 + 元件重用 |
| Local Storage | SQLite | IndexedDB | **SQLite** | Native Host 需要關聯式資料庫 |
| Messaging | Native Messaging | WebSocket | **Native Messaging** | Chrome 官方支援 + 更安全 |

---

## 成本分析

### 舊架構 (v1.0 - 集中式)

```
每 1000 位使用者：
- Vercel hosting: $20/月
- Supabase Pro: $25/月
- Browser pool (5 instances): $200/月 (EC2 t3.large x 5)
- Redis: $15/月
- 總計: $260/月

每增加 1000 位使用者需增加 $200/月 (browser pool)
```

### 新架構 (v2.0 - 客戶端)

```
每 10,000 位使用者：
- Vercel hosting: $20/月
- Supabase Pro: $25/月
- AI API (Claude/Gemini): $100/月
- WebSocket server: $20/月
- 總計: $165/月

使用者增長對成本影響極小！
邊際成本降低 92%
```

---

## 競爭優勢

### vs Buffer / Hootsuite (傳統 Social Media 工具)

| 功能 | Pulsar v2.0 | 競品 |
|------|-------------|------|
| AI Content Generation | ✅ Persona-based | ⚠️ 基本模板 |
| 憑證安全性 | ✅ 本地儲存 | ❌ 雲端儲存 |
| IP 分散 | ✅ 使用者 IP | ❌ 集中式 IP 易被封 |
| 價格 | $29/月 | $99/月 |

### vs 純 SaaS (如 Lately.ai)

| 功能 | Pulsar v2.0 | Lately.ai |
|------|-------------|-----------|
| 隱私保護 | ✅ 憑證本地 | ❌ 需提供憑證 |
| Browser Automation | ✅ Puppeteer | ⚠️ API only (功能受限) |
| 離線運作 | ✅ 可能 | ❌ 需要網路 |

---

## 下一步行動

### 本週 (POC 啟動)

- [ ] 建立 `pulsar-native-host` 專案
- [ ] 實作 Native Messaging 基本通訊
- [ ] 測試 Extension ↔ Native Host 連線
- [ ] 實作 Twitter 發文 POC

### 下週 (整合測試)

- [ ] Backend WebSocket 整合
- [ ] 實作 job scheduling
- [ ] 加入 LinkedIn 支援
- [ ] 撰寫安裝文件

### 本月底 (內部測試)

- [ ] 邀請 5 位內部測試使用者
- [ ] 收集回饋並修正 bugs
- [ ] 準備 Alpha 版本發布計畫

---

## 附錄

### 參考資料

- [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [Electron Documentation](https://www.electronjs.org/docs/latest)
- [Puppeteer API](https://pptr.dev/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

### 相關專案

- Hermes: 個人 Twitter/LinkedIn 自動化 (LaunchAgent 架構)
- Apollo: IrisGo 公司帳號管理 (LaunchAgent 架構)
- Pulsar v1.0: 原型系統 (集中式架構)

---

**文件版本：** v2.0.0
**最後更新：** 2026-01-11
**作者：** Claude (Iris) + Lman
**狀態：** 🚧 架構設計階段
