# Playwright Service 整合計劃

> 狀態：✅ 已驗證可行，待整合
> 日期：2026-01-03
> 優先級：P2（出差後執行）

## 背景

Chrome Extension 無法自動輸入文字到 React 應用（Threads、LinkedIn），因為：
- `execCommand` 和 DOM manipulation 不會觸發 React 的 synthetic events
- React 維護自己的 Virtual DOM，忽略直接的 DOM 變更

**解決方案**：使用 Playwright 的 `pressSequentially()` 透過 CDP 模擬真實鍵盤事件。

## 驗證結果

✅ 2026-01-03 測試成功：
- Playwright 成功輸入文字到 Threads compose box
- 截圖證明：`/tmp/threads-test-4.png`
- 測試腳本：`test-threads-simple.ts`

## 整合步驟

### Phase 1: 啟動 Playwright Service

```bash
# 1. 安裝依賴
cd apps/playwright-service
npm install
npm run install-browsers

# 2. PM2 啟動
pm2 start npm --name "pulsar-playwright" -- run dev
pm2 save
```

### Phase 2: 修改 API Routes

修改 `apps/web/app/api/content-jobs/[id]/post/route.ts`：

```typescript
// 判斷是否使用 Playwright
const usePlaywright = ['linkedin', 'threads'].includes(job.platform)

if (usePlaywright) {
  // 呼叫 Playwright service
  const response = await fetch('http://localhost:3100/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: job.platform,
      content: job.final_content,
      jobType: job.job_type,
      targetUrl: job.target_url,
    }),
  })
  const result = await response.json()
  // 更新 job 狀態
} else {
  // 原有 Chrome Extension 流程 (Twitter)
}
```

### Phase 3: 前端 UI 更新

1. 移除 LinkedIn/Threads 的「半自動」標籤
2. 更新 PLATFORM_AUTOMATION 設定：
   ```typescript
   const PLATFORM_AUTOMATION = {
     twitter: { level: 'full', label: '全自動' },
     linkedin: { level: 'full', label: '全自動' },  // 改為 full
     threads: { level: 'full', label: '全自動' },   // 改為 full
   }
   ```

### Phase 4: Session 管理

1. 建立登入管理頁面 `/dashboard/settings/browser-sessions`
2. 顯示各平台登入狀態
3. 提供「重新登入」按鈕開啟 Playwright 瀏覽器

## 檔案結構

```
apps/playwright-service/
├── package.json
├── tsconfig.json
├── README.md
├── INTEGRATION-PLAN.md     # 本文件
├── test-threads.ts         # 原始測試
├── test-threads-simple.ts  # 簡化測試（已驗證成功）
└── src/
    ├── server.ts           # Express API (:3100)
    ├── browser-manager.ts  # Browser context 管理
    └── posters/
        ├── twitter.ts
        ├── linkedin.ts
        └── threads.ts
```

## 注意事項

1. **首次需手動登入**：每個平台第一次使用需要在 Playwright 瀏覽器中登入
2. **Session 位置**：`~/.pulsar/browser-data/{platform}/`
3. **非 Headless**：發文時瀏覽器視窗會短暫出現（可考慮 xvfb 虛擬螢幕）
4. **Selector 維護**：平台 UI 更新時可能需要調整選擇器

## 相關資源

- [Playwright Input 文件](https://playwright.dev/docs/input)
- [OpenManus 參考](https://github.com/FoundationAgents/OpenManus)
- [browser-use](https://github.com/browser-use/browser-use)
