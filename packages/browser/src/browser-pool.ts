import puppeteer, { Browser, Page } from 'puppeteer'

export interface BrowserInstance {
  browser: Browser
  page: Page
  inUse: boolean
  createdAt: Date
}

export class BrowserPool {
  private pool: BrowserInstance[] = []
  private maxSize: number
  private maxAge: number // milliseconds

  constructor(maxSize = 5, maxAgeMinutes = 30) {
    this.maxSize = maxSize
    this.maxAge = maxAgeMinutes * 60 * 1000
  }

  async acquire(): Promise<{ browser: Browser; page: Page; release: () => void }> {
    // Clean up old instances
    await this.cleanup()

    // Find available instance
    const available = this.pool.find((instance) => !instance.inUse)

    if (available) {
      available.inUse = true
      return {
        browser: available.browser,
        page: available.page,
        release: () => {
          available.inUse = false
        },
      }
    }

    // Create new instance if pool not full
    if (this.pool.length < this.maxSize) {
      const instance = await this.createInstance()
      this.pool.push(instance)
      return {
        browser: instance.browser,
        page: instance.page,
        release: () => {
          instance.inUse = false
        },
      }
    }

    // Wait for available instance
    return new Promise((resolve) => {
      const check = setInterval(async () => {
        const available = this.pool.find((instance) => !instance.inUse)
        if (available) {
          clearInterval(check)
          available.inUse = true
          resolve({
            browser: available.browser,
            page: available.page,
            release: () => {
              available.inUse = false
            },
          })
        }
      }, 1000)
    })
  }

  private async createInstance(): Promise<BrowserInstance> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    })

    const page = await browser.newPage()

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 })

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    return {
      browser,
      page,
      inUse: true,
      createdAt: new Date(),
    }
  }

  private async cleanup(): Promise<void> {
    const now = Date.now()
    const toRemove: number[] = []

    for (let i = 0; i < this.pool.length; i++) {
      const instance = this.pool[i]
      if (!instance) continue

      const age = now - instance.createdAt.getTime()

      if (!instance.inUse && age > this.maxAge) {
        await instance.browser.close()
        toRemove.push(i)
      }
    }

    // Remove in reverse order to maintain indices
    for (const idx of toRemove.reverse()) {
      this.pool.splice(idx, 1)
    }
  }

  async closeAll(): Promise<void> {
    for (const instance of this.pool) {
      await instance.browser.close()
    }
    this.pool = []
  }
}

// Global pool instance
let globalPool: BrowserPool | null = null

export function getBrowserPool(): BrowserPool {
  if (!globalPool) {
    globalPool = new BrowserPool()
  }
  return globalPool
}
