# Pulsar Native Host

> Desktop application for client-side browser automation

## 概述

Pulsar Native Host 是一個 Electron 應用程式，負責：

1. 接收來自 Chrome Extension 的指令 (Native Messaging)
2. 執行 Puppeteer browser automation
3. 安全地管理使用者憑證 (加密儲存)
4. 本地任務佇列管理

## 架構

```
Native Host
├── Native Messaging Host    # STDIO 通訊
├── Job Executor             # Puppeteer automation
├── Account Manager          # 憑證加密管理
└── Job Queue                # SQLite 本地佇列
```

## 開發

### 安裝依賴

```bash
pnpm install
```

### 開發模式

```bash
# 啟動 Native Messaging Host (開發模式)
pnpm dev

# 監聽模式 (檔案變更自動重啟)
pnpm dev
```

### 測試 Native Messaging

```bash
# 手動測試
echo '{"type":"get_status","requestId":"test-001"}' | node dist/native-messaging/host.js
```

### 建置

```bash
# TypeScript 編譯
pnpm build

# 打包為 Electron app
pnpm dist
```

## 安裝

### macOS

```bash
# 從 DMG 安裝
open release/Pulsar-2.0.0.dmg

# 或直接拖曳到 Applications
```

### Windows

```bash
# 執行安裝程式
release/Pulsar-Setup-2.0.0.exe
```

### 驗證安裝

```bash
# 檢查 Native Messaging manifest
cat ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.irisgo.pulsar.json

# 測試連線
# 開啟 Extension popup，檢查狀態指示燈
```

## 使用

### 1. 啟動應用程式

Native Host 會在系統啟動時自動執行（系統列常駐）。

**手動啟動：**
- macOS: 開啟 `Applications/Pulsar.app`
- Windows: 開始選單 → Pulsar

### 2. 新增帳號

透過 Chrome Extension 新增社群媒體帳號：

1. 開啟 Extension 設定頁面
2. 點擊「新增帳號」
3. 選擇平台 (Twitter/LinkedIn/Threads)
4. 輸入憑證或匯入 session cookies
5. 憑證會加密儲存在本機

### 3. 執行任務

任務可以透過以下方式觸發：

- **手動執行**: Extension popup → 「立即發文」
- **排程執行**: Backend 推送任務 → Extension → Native Host
- **定時任務**: 設定固定時間自動發文

## 檔案結構

```
~/
├── .pulsar/
│   ├── accounts.db        # 加密的帳號資料庫
│   ├── jobs.db            # 本地任務佇列
│   └── logs/              # 日誌檔案
└── Library/Application Support/Google/Chrome/NativeMessagingHosts/
    └── com.irisgo.pulsar.json  # Native Messaging manifest
```

## 通訊協議

詳見 [NATIVE-MESSAGING-PROTOCOL.md](../../NATIVE-MESSAGING-PROTOCOL.md)

### 訊息範例

**Extension → Native Host: 執行發文**
```json
{
  "type": "execute_job",
  "requestId": "req-123",
  "payload": {
    "jobId": "job-456",
    "platform": "twitter",
    "action": "post",
    "content": "Hello from Pulsar! 🚀",
    "accountId": "account-789"
  }
}
```

**Native Host → Extension: 任務完成**
```json
{
  "type": "job_status",
  "requestId": "req-123",
  "payload": {
    "jobId": "job-456",
    "status": "completed",
    "postUrl": "https://twitter.com/user/status/123456"
  }
}
```

## 安全性

### 憑證加密

- 使用 AES-256-GCM 加密演算法
- 加密金鑰衍生自系統 Keychain (macOS) 或 Credential Manager (Windows)
- 憑證永不離開本機

### 資料隔離

- 每個使用者的資料獨立儲存
- SQLite 資料庫使用 WAL mode 確保資料一致性
- 敏感資料不寫入日誌檔案

## 除錯

### 查看日誌

```bash
# macOS
tail -f ~/Library/Logs/Pulsar/main.log

# 或使用 Console.app
# Filter: process:Pulsar
```

### 常見問題

**1. Extension 無法連接 Native Host**

檢查：
```bash
# 1. Manifest 是否存在
ls -la ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/

# 2. Host 執行檔是否可執行
ls -la /Applications/Pulsar.app/Contents/MacOS/native-host

# 3. 測試直接執行
echo '{"type":"heartbeat","requestId":"test"}' | /Applications/Pulsar.app/Contents/MacOS/native-host
```

**2. Browser automation 失敗**

- 檢查 Puppeteer 是否正確安裝
- 確認系統有足夠記憶體 (建議 4GB+)
- 查看 logs 找出具體錯誤

**3. 憑證解密失敗**

- 重新登入帳號
- 檢查系統 Keychain 是否可存取

## 效能調校

### Browser Pool 大小

預設同時運行 3 個 browser instances。調整：

```typescript
// src/automation/job-executor.ts
private maxPoolSize = 5; // 增加到 5
```

### 記憶體管理

```typescript
// 定期清理舊 browser instances
setInterval(() => {
  this.cleanupOldBrowsers();
}, 30 * 60 * 1000); // 每 30 分鐘
```

## 開發指南

### 新增平台支援

1. 在 `packages/browser/src/` 建立 `newplatform.ts`
2. 實作 `login()`, `post()`, `reply()` 方法
3. 在 `job-executor.ts` 加入新平台的 switch case
4. 更新 Protocol 類型定義

### 新增自動化動作

```typescript
// src/automation/twitter.ts
async like(tweetUrl: string): Promise<void> {
  await this.page.goto(tweetUrl);
  await this.page.click('[data-testid="like"]');
  await this.page.waitForSelector('[data-testid="unlike"]');
}
```

## Roadmap

- [ ] v2.1: 系統 Keychain 整合 (keytar)
- [ ] v2.2: Browser headless mode 優化
- [ ] v2.3: 多使用者支援
- [ ] v2.4: 遠端除錯功能

## 授權

Proprietary - IrisGo

---

**版本：** v2.0.0
**最後更新：** 2026-01-11
