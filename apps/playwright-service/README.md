# Pulsar Playwright Service

Browser automation service for social media posting using Playwright.

## Why Playwright?

Chrome extensions can't properly input text into React applications (like Threads and LinkedIn) because:
- `execCommand` and DOM manipulation don't trigger React's synthetic events
- React maintains its own virtual DOM that ignores direct DOM changes

Playwright's `pressSequentially()` and `fill()` methods work because they:
- Simulate real keyboard events at the browser level
- Trigger native DOM events that React listens to
- Work through Chrome DevTools Protocol (CDP)

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install-browsers

# Start development server
npm run dev
```

## Testing

Test Threads input:
```bash
npx tsx test-threads.ts
```

This will:
1. Open a browser window
2. Navigate to Threads
3. If not logged in, wait for you to log in manually
4. If logged in, type a test message into the compose box

## API Endpoints

### Health Check
```
GET /health
Response: { "status": "ok", "service": "pulsar-playwright" }
```

### Check Login Status
```
GET /status/:platform
Platforms: twitter, linkedin, threads
Response: { "platform": "threads", "loggedIn": true }
```

### Open Login Page
```
POST /login/:platform
Response: { "success": true, "message": "Please log in..." }
```

### Post Content
```
POST /post
Body: {
  "platform": "threads",
  "content": "Hello world!",
  "jobType": "post" | "reply",
  "targetUrl": "..." // required for replies
}
Response: { "success": true, "postUrl": "..." }
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Playwright Service                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐                     │
│  │   Express    │────▶│   Browser    │                     │
│  │   Server     │     │   Manager    │                     │
│  └──────────────┘     └──────┬───────┘                     │
│        :3100                 │                              │
│                              ▼                              │
│            ┌─────────────────────────────────┐             │
│            │  Persistent Browser Contexts     │             │
│            │                                  │             │
│            │  ~/.pulsar/browser-data/         │             │
│            │  ├── twitter/                    │             │
│            │  ├── linkedin/                   │             │
│            │  └── threads/                    │             │
│            └─────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## Session Persistence

Each platform has its own browser profile stored in `~/.pulsar/browser-data/`.
This preserves:
- Login cookies
- Local storage
- Session data

After logging in once, you won't need to log in again.

## Integration with Pulsar Web

To integrate with the main Pulsar web app:

1. Run this service on port 3100
2. Update content-jobs API to call this service instead of the Chrome extension
3. Add PM2 config to keep this service running

Example integration:
```typescript
// In apps/web/app/api/content-jobs/[id]/post/route.ts
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
```

## Limitations

- Browser must run with visible window (headless mode won't work for login)
- Requires manual login once per platform
- Platform selectors may need updates when sites change their UI
