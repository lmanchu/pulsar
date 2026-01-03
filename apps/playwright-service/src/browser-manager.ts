import { chromium, Browser, BrowserContext, Page } from 'playwright'
import path from 'path'
import fs from 'fs'

export type Platform = 'twitter' | 'linkedin' | 'threads'

interface PlatformConfig {
  name: Platform
  userDataDir: string
  urls: {
    home: string
    compose?: string
  }
}

const PLATFORMS: Record<Platform, PlatformConfig> = {
  twitter: {
    name: 'twitter',
    userDataDir: path.join(process.env.HOME || '', '.pulsar/browser-data/twitter'),
    urls: {
      home: 'https://x.com',
      compose: 'https://x.com/compose/tweet',
    },
  },
  linkedin: {
    name: 'linkedin',
    userDataDir: path.join(process.env.HOME || '', '.pulsar/browser-data/linkedin'),
    urls: {
      home: 'https://www.linkedin.com',
    },
  },
  threads: {
    name: 'threads',
    userDataDir: path.join(process.env.HOME || '', '.pulsar/browser-data/threads'),
    urls: {
      home: 'https://www.threads.com',
    },
  },
}

export class BrowserManager {
  private browser: Browser | null = null
  private contexts: Map<Platform, BrowserContext> = new Map()

  async initialize() {
    // Ensure data directories exist
    for (const config of Object.values(PLATFORMS)) {
      fs.mkdirSync(config.userDataDir, { recursive: true })
    }

    // Launch browser with persistent context support
    this.browser = await chromium.launch({
      headless: false, // Need visible browser for login
      args: ['--disable-blink-features=AutomationControlled'],
    })

    console.log('Browser launched successfully')
  }

  async getContext(platform: Platform): Promise<BrowserContext> {
    if (!this.browser) {
      throw new Error('Browser not initialized')
    }

    // Return existing context if available
    const existing = this.contexts.get(platform)
    if (existing) {
      return existing
    }

    // Create new persistent context
    const config = PLATFORMS[platform]
    const context = await chromium.launchPersistentContext(config.userDataDir, {
      headless: false,
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: ['--disable-blink-features=AutomationControlled'],
    })

    this.contexts.set(platform, context)
    console.log(`Created context for ${platform}`)
    return context
  }

  async getPage(platform: Platform): Promise<Page> {
    const context = await this.getContext(platform)
    const pages = context.pages()

    if (pages.length > 0) {
      return pages[0]
    }

    return context.newPage()
  }

  async isLoggedIn(platform: Platform): Promise<boolean> {
    try {
      const page = await this.getPage(platform)
      const config = PLATFORMS[platform]

      await page.goto(config.urls.home, { waitUntil: 'domcontentloaded', timeout: 10000 })
      await page.waitForTimeout(2000)

      switch (platform) {
        case 'twitter':
          // Check for compose button or profile icon
          return await page.locator('[data-testid="SideNav_NewTweet_Button"]').isVisible().catch(() => false)

        case 'linkedin':
          // Check for nav bar or profile section
          return await page.locator('.global-nav__me').isVisible().catch(() => false)

        case 'threads':
          // Check for create button or profile
          const createBtn = page.locator('svg[aria-label="新增貼文"], svg[aria-label="New post"], [aria-label="Create"]')
          return await createBtn.first().isVisible().catch(() => false)

        default:
          return false
      }
    } catch (error) {
      console.error(`Error checking login status for ${platform}:`, error)
      return false
    }
  }

  async openLoginPage(platform: Platform): Promise<{ success: boolean; message: string }> {
    try {
      const page = await this.getPage(platform)
      const config = PLATFORMS[platform]

      await page.goto(config.urls.home, { waitUntil: 'networkidle' })
      await page.bringToFront()

      return {
        success: true,
        message: `Please log in to ${platform} in the browser window`,
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to open ${platform}: ${error}`,
      }
    }
  }

  async close() {
    for (const context of this.contexts.values()) {
      await context.close()
    }
    this.contexts.clear()

    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

export const browserManager = new BrowserManager()
