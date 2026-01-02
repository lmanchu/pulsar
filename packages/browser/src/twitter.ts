import type { Page } from 'puppeteer'

export interface TwitterCredentials {
  username: string
  password: string
  email?: string
}

export interface SessionCookie {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

export class TwitterAutomation {
  private page: Page
  private loggedIn = false

  constructor(page: Page) {
    this.page = page
  }

  async loginWithCookies(cookies: SessionCookie[]): Promise<void> {
    if (this.loggedIn) return

    // Set cookies before navigating
    await this.page.setCookie(
      ...cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain || '.twitter.com',
        path: c.path || '/',
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure ?? true,
        sameSite: c.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
      }))
    )

    // Navigate to home to verify session
    await this.page.goto('https://twitter.com/home', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    // Wait for page to stabilize
    await this.delay(3000)

    // Check if we're actually logged in
    const currentUrl = this.page.url()
    if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
      throw new Error('Session cookies expired or invalid')
    }

    this.loggedIn = true
  }

  async login(credentials: TwitterCredentials): Promise<void> {
    if (this.loggedIn) return

    await this.page.goto('https://twitter.com/login', {
      waitUntil: 'networkidle0',
    })

    // Enter username
    await this.page.waitForSelector('input[autocomplete="username"]')
    await this.page.type('input[autocomplete="username"]', credentials.username, {
      delay: 50,
    })

    // Click next
    await this.page.click('[role="button"]:has-text("Next")')
    await this.delay(1000)

    // Check if email verification is needed
    const emailInput = await this.page.$('input[data-testid="ocfEnterTextTextInput"]')
    if (emailInput && credentials.email) {
      await emailInput.type(credentials.email, { delay: 50 })
      await this.page.click('[data-testid="ocfEnterTextNextButton"]')
      await this.delay(1000)
    }

    // Enter password
    await this.page.waitForSelector('input[type="password"]')
    await this.page.type('input[type="password"]', credentials.password, {
      delay: 50,
    })

    // Click login
    await this.page.click('[data-testid="LoginForm_Login_Button"]')
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' })

    this.loggedIn = true
  }

  async post(content: string): Promise<string> {
    await this.page.goto('https://twitter.com/compose/tweet', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })

    // Wait for composer
    await this.page.waitForSelector('[data-testid="tweetTextarea_0"]')
    await this.delay(500)

    // Type content
    await this.page.type('[data-testid="tweetTextarea_0"]', content, {
      delay: 30,
    })
    await this.delay(500)

    // Click post and wait for tweet to be submitted
    await this.page.click('[data-testid="tweetButton"]')

    // Wait for the compose modal to close (tweet submitted)
    // The modal will close after successful submission
    try {
      await this.page.waitForFunction(
        () => !document.querySelector('[data-testid="tweetTextarea_0"]'),
        { timeout: 15000 }
      )
    } catch {
      // Check for error message
      const errorElement = await this.page.$('[data-testid="toast"]')
      if (errorElement) {
        const errorText = await errorElement.evaluate((el) => el.textContent)
        throw new Error(`Tweet failed: ${errorText}`)
      }
      throw new Error('Tweet submission timed out')
    }

    await this.delay(1000)

    // Navigate to home to find the posted tweet
    await this.page.goto('https://twitter.com/home', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    await this.delay(2000)

    // Get the first tweet link (should be the just-posted tweet)
    const tweetLink = await this.page.$eval(
      'article[data-testid="tweet"] a[href*="/status/"]',
      (el) => el.getAttribute('href')
    ).catch(() => null)

    if (tweetLink) {
      return `https://twitter.com${tweetLink}`
    }

    // Fallback: return home URL to indicate success
    return 'https://twitter.com/home'
  }

  async reply(targetUrl: string, content: string): Promise<string> {
    await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })

    // Click reply button
    await this.page.waitForSelector('[data-testid="reply"]')
    await this.page.click('[data-testid="reply"]')
    await this.delay(500)

    // Wait for reply composer
    await this.page.waitForSelector('[data-testid="tweetTextarea_0"]')
    await this.delay(500)

    // Type content
    await this.page.type('[data-testid="tweetTextarea_0"]', content, {
      delay: 30,
    })
    await this.delay(500)

    // Click reply
    await this.page.click('[data-testid="tweetButton"]')
    await this.delay(2000)

    return this.page.url()
  }

  async getLatestTweets(handle: string, count = 5): Promise<string[]> {
    await this.page.goto(`https://twitter.com/${handle}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })

    await this.delay(2000)

    // Get tweet texts
    const tweets = await this.page.$$eval(
      '[data-testid="tweetText"]',
      (elements, limit) =>
        elements.slice(0, limit).map((el) => el.textContent || ''),
      count
    )

    return tweets
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
