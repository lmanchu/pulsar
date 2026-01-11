# Pulsar Extension v2.0

> Chrome Extension for client-side social media automation

## 功能

- 🔗 與 Native Host 通訊 (Native Messaging)
- 📡 連接 Backend API (WebSocket)
- 📋 本地任務佇列管理
- 📊 即時狀態監控
- 🔔 任務完成通知

## 安裝

### 開發模式

1. 在 Chrome 開啟 `chrome://extensions/`
2. 啟用「開發人員模式」
3. 點擊「載入未封裝項目」
4. 選擇此目錄 (`pulsar-extension-v2`)

### 生產模式

打包為 `.zip` 並上傳到 Chrome Web Store。

## 架構

```
pulsar-extension-v2/
├── manifest.json          # Extension 設定檔
├── background.js          # Service Worker (主要邏輯)
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css
│   └── popup.js
├── options/
│   ├── options.html       # 設定頁面
│   ├── options.css
│   └── options.js
├── lib/
│   ├── native-messaging.js    # Native Messaging 封裝
│   ├── websocket.js           # WebSocket 客戶端
│   └── job-queue.js           # 任務佇列管理
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 依賴

### Native Host

Extension 需要 Native Host (`pulsar-native-host`) 才能執行 browser automation。

**安裝 Native Host：**
1. 下載 `Pulsar.app` (macOS) 或 `Pulsar.exe` (Windows)
2. 安裝並啟動應用程式
3. Native Host manifest 會自動註冊

**檢查連線：**
打開 Extension popup，檢查左上角的狀態點：
- 🟢 綠色 = 已連接
- 🔴 紅色 = 未連接

### Backend API

Extension 會連接到 `wss://pulsar.irisgo.xyz/ws` 接收任務。

**需要登入：**
1. 打開 Extension 設定頁面
2. 登入 Pulsar 帳號
3. Extension 會自動連接 Backend

## 開發

### 本地測試

```bash
# 1. 載入 Extension 到 Chrome
# 2. 啟動 Native Host (另一個專案)
cd ../pulsar-native-host
npm run dev

# 3. 測試通訊
# 開啟 Extension popup，檢查狀態指示燈
```

### 除錯

**Service Worker 日誌：**
1. 打開 `chrome://extensions/`
2. 找到 Pulsar Extension
3. 點擊「Service Worker」查看日誌

**Popup 日誌：**
1. 右鍵點擊 Extension icon
2. 選擇「檢查 popup」
3. 查看 Console

## 通訊協議

詳見 [NATIVE-MESSAGING-PROTOCOL.md](../../NATIVE-MESSAGING-PROTOCOL.md)

### 範例訊息

**執行任務：**
```javascript
// Extension → Native Host
{
  type: "execute_job",
  requestId: "req-123",
  payload: {
    jobId: "job-456",
    platform: "twitter",
    action: "post",
    content: "Hello world!",
    accountId: "account-789"
  }
}
```

**狀態更新：**
```javascript
// Native Host → Extension
{
  type: "job_status",
  requestId: "req-123",
  payload: {
    jobId: "job-456",
    status: "completed",
    postUrl: "https://twitter.com/user/status/123"
  }
}
```

## 安全性

- 所有憑證儲存在本機 (chrome.storage.local)
- 使用 AES-256-GCM 加密
- 永不傳送憑證到後端
- Native Messaging 使用 STDIO (不經過網路)

## 限制

- 需要 Native Host 運行才能執行自動化
- 電腦關機時無法執行排程任務
- Chrome 必須保持開啟 (Service Worker 可能被暫停)

## Roadmap

- [ ] v2.1: 支援多帳號管理
- [ ] v2.2: 離線模式與同步
- [ ] v2.3: 進階排程 (cron expression)
- [ ] v2.4: 內容編輯器整合

## 相關專案

- **Pulsar Native Host**: Desktop app for browser automation
- **Pulsar Backend**: API server (pulsar.irisgo.xyz)
- **Pulsar Web**: Next.js dashboard

## 授權

Proprietary - IrisGo

---

**版本：** v2.0.0
**最後更新：** 2026-01-11
