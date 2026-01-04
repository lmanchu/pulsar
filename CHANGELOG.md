# Changelog

All notable changes to Pulsar will be documented in this file.

## [0.2.0] - 2026-01-04

### Added
- **CLIProxyAPI Integration**: Zero-cost AI content generation using existing Gemini Advanced subscription
  - Added `baseURL` and `defaultModel` support to ContentGenerator
  - Automatic provider detection (CLIProxyAPI vs OpenAI)
  - Backward compatible with existing string API key configuration

### Changed
- **@pulsar/core v0.2.0**
  - Enhanced `ContentGenerator` to support custom base URL and model configuration
  - New `ContentGeneratorConfig` interface for flexible initialization
  - Maintains backward compatibility with legacy string API key parameter

- **@pulsar/worker v0.1.1**
  - Updated to use new ContentGenerator configuration format
  - Added CLIProxyAPI configuration to environment variables
  - Enhanced startup logs to show AI provider and model information
  - Fixed error message reference from ANTHROPIC_API_KEY to OPENAI_API_KEY

### Configuration
- New environment variables for CLIProxyAPI:
  - `OPENAI_BASE_URL`: API endpoint (default: http://127.0.0.1:8317/v1 for CLIProxyAPI)
  - `AI_MODEL`: Model to use (default: gemini-2.5-flash)
  - `OPENAI_API_KEY`: API key or proxy key (e.g., magi-proxy-key-2026)

### Testing
- Added `test-cliproxy-integration.mjs` for integration testing
- Verified content generation works with CLIProxyAPI (3.31s response time)
- Confirmed Worker successfully initializes and polls for jobs

## [0.1.0] - 2024-12-29

### Initial Release
- Core content generation library
- Multi-platform worker (Twitter, LinkedIn, Threads)
- Browser automation with Puppeteer
- Supabase integration for job management
- Encrypted credential storage
