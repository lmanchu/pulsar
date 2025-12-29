# Pulsar

> Your social presence, on autopilot

AI-powered social media automation for Twitter and LinkedIn.

## Features

- **AI Content Generation** - Generate posts that match your voice and expertise
- **Smart Replies** - Automatically engage with your network and tracked accounts
- **Auto Scheduling** - Set your schedule and let Pulsar handle the rest
- **Multi-Platform** - Twitter and LinkedIn from one dashboard

## Architecture

```
pulsar/
├── apps/
│   ├── web/           # Next.js frontend (pulsar.irisgo.xyz)
│   └── worker/        # BullMQ job workers
├── packages/
│   ├── core/          # Content generation & types
│   ├── db/            # Supabase client
│   └── browser/       # Puppeteer automation
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

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development
pnpm dev
```

## Environment Variables

See `.env.example` for required environment variables:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `REDIS_URL` - Redis connection string
- `ANTHROPIC_API_KEY` - Claude API key
- `TWITTER_USERNAME` / `TWITTER_PASSWORD` - Twitter credentials
- `LINKEDIN_EMAIL` / `LINKEDIN_PASSWORD` - LinkedIn credentials

## Development

```bash
# Run all apps
pnpm dev

# Run specific app
pnpm dev --filter=@pulsar/web
pnpm dev --filter=@pulsar/worker

# Build all packages
pnpm build

# Type check
pnpm check-types

# Lint
pnpm lint
```

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| Starter | $29/mo | 1 platform, 3 posts/day, 5 replies/day |
| Pro | $79/mo | 2 platforms, 10 posts/day, 20 replies/day, tracked accounts |
| Agency | $199/mo | 5 accounts, white label, API access |

## License

Proprietary - IrisGo

---

Built with love by [IrisGo](https://irisgo.ai)
