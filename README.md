# Pulsar

> Your social presence, on autopilot

AI-powered social media automation for Twitter and LinkedIn with **privacy-first client-side browser control**.

## 🎯 What's New in v2.0

Pulsar v2.0 introduces a revolutionary **hybrid architecture** that moves browser automation from cloud servers to your local machine:

- 🔒 **Privacy First**: Your credentials never leave your computer
- 💰 **Cost Effective**: No expensive browser pools to maintain
- 🌍 **IP Distribution**: Each user posts from their own IP (no centralized rate limits)
- 📈 **Scalable**: User growth doesn't increase infrastructure costs

**Architecture shift:**
- v1.0: Centralized backend automation (expensive, privacy concerns)
- v2.0: Client-side automation via Chrome Extension + Native Host (secure, scalable)

## Features

- **AI Content Generation** - Generate posts that match your voice and expertise
- **Smart Replies** - Automatically engage with your network and tracked accounts
- **Auto Scheduling** - Set your schedule and let Pulsar handle the rest
- **Multi-Platform** - Twitter and LinkedIn from one dashboard
- **Client-Side Automation** - Browser automation runs on your machine (v2.0+)
- **Encrypted Credentials** - AES-256-GCM encryption, stored locally only

## Architecture

### v2.0 (Client-Side Hybrid)

```
pulsar/
├── apps/
│   ├── web/           # Next.js API & Dashboard (pulsar.irisgo.xyz)
│   ├── worker/        # AI content generation workers
│   └── native-host/   # 🆕 Electron app for browser automation
├── extensions/
│   └── pulsar-extension-v2/  # 🆕 Chrome Extension (WebSocket + Native Messaging)
├── packages/
│   ├── core/          # Content generation & types
│   ├── db/            # Supabase client
│   └── browser/       # Puppeteer automation (shared)
└── docs/
    ├── ARCHITECTURE-V2.md              # Complete v2.0 architecture
    └── NATIVE-MESSAGING-PROTOCOL.md    # Extension ↔ Native Host protocol
```

### v1.0 (Legacy - Deprecated)

```
pulsar/
├── apps/
│   ├── web/           # Next.js frontend
│   └── worker/        # BullMQ job workers (backend automation)
└── docker/
    └── puppeteer/     # Browser pool container
```

## Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS, React 19
- **Backend**: Node.js, BullMQ, Redis
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude API (Haiku)
- **Automation**: Puppeteer
- **Deployment**: Vercel (web), Mac Studio (workers)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Chrome/Chromium browser
- macOS, Windows, or Linux

### Installation (v2.0)

**1. Clone repository**
```bash
git clone https://github.com/irisgoai/pulsar.git
cd pulsar
```

**2. Install dependencies**
```bash
pnpm install
```

**3. Set up environment**
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

**4. Install Native Host**
```bash
cd apps/native-host
pnpm install
pnpm build
pnpm run postinstall  # Installs Chrome Native Messaging manifest
```

**5. Load Extension**
1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `extensions/pulsar-extension-v2/`

**6. Start Backend**
```bash
cd apps/web
pnpm dev
```

**7. Start Native Host**
```bash
cd apps/native-host
pnpm dev
```

**8. Verify Setup**
- Open Extension popup
- Check status indicators (should be 🟢 green)
- Add your first social media account

## Environment Variables

See `.env.example` for required environment variables:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `REDIS_URL` - Redis connection string
- `ANTHROPIC_API_KEY` - Claude API key
- `TWITTER_USERNAME` / `TWITTER_PASSWORD` - Twitter credentials
- `LINKEDIN_EMAIL` / `LINKEDIN_PASSWORD` - LinkedIn credentials

## Development

### Running in Development Mode

```bash
# Terminal 1: Backend API
cd apps/web
pnpm dev

# Terminal 2: Native Host
cd apps/native-host
pnpm dev

# Extension runs automatically in Chrome
```

### Building

```bash
# Build all packages
pnpm build

# Build specific app
pnpm build --filter=@pulsar/web
pnpm build --filter=@pulsar/native-host

# Package Extension
cd extensions/pulsar-extension-v2
zip -r pulsar-extension.zip . -x "*.git*" -x "node_modules/*"

# Package Native Host (Electron)
cd apps/native-host
pnpm dist  # Creates .dmg (macOS) or .exe (Windows)
```

### Testing

```bash
# Type check
pnpm check-types

# Lint
pnpm lint

# Test Native Messaging
echo '{"type":"get_status","requestId":"test"}' | node apps/native-host/dist/native-messaging/host.js
```

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| Starter | $29/mo | 1 platform, 3 posts/day, 5 replies/day |
| Pro | $79/mo | 2 platforms, 10 posts/day, 20 replies/day, tracked accounts |
| Agency | $199/mo | 5 accounts, white label, API access |

## Documentation

- **[Architecture v2.0](./ARCHITECTURE-V2.md)** - Complete system design
- **[Native Messaging Protocol](./NATIVE-MESSAGING-PROTOCOL.md)** - Extension ↔ Native Host communication
- **[Extension README](./extensions/pulsar-extension-v2/README.md)** - Chrome Extension guide
- **[Native Host README](./apps/native-host/README.md)** - Desktop app guide

## Security

- All credentials encrypted with AES-256-GCM
- Credentials never sent to backend servers
- Native Messaging uses STDIO (no network exposure)
- Browser automation runs locally only

## Roadmap

### v2.0 (Current - POC Phase)
- [x] Architecture design
- [x] Chrome Extension scaffold
- [x] Native Host scaffold
- [x] Native Messaging protocol
- [ ] POC: Twitter posting
- [ ] POC: End-to-end workflow

### v2.1 (Alpha)
- [ ] LinkedIn support
- [ ] WebSocket backend integration
- [ ] Job scheduling
- [ ] Internal testing (5-10 users)

### v2.2 (Beta)
- [ ] Threads support
- [ ] Multi-account management
- [ ] Chrome Web Store listing
- [ ] Public beta (50-100 users)

### v2.3 (Production)
- [ ] Payment integration
- [ ] Customer support
- [ ] Public launch

## Related Projects

- **Hermes**: Personal social media automation (LaunchAgent based)
- **Apollo**: IrisGo company account automation
- **Helix**: AI workflow annotation platform

## License

Proprietary - IrisGo

---

**Version**: v2.0.0-beta.1
**Last Updated**: 2026-01-11
Built with love by [IrisGo](https://irisgo.ai)
