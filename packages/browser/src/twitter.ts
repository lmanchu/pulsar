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
      waitUntil: 'networkidle0',
    })

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
      waitUntil: 'networkidle0',
    })

    // Wait for composer
    await this.page.waitForSelector('[data-testid="tweetTextarea_0"]')
    await this.delay(500)

    // Type content
    await this.page.type('[data-testid="tweetTextarea_0"]', content, {
      delay: 30,
    })
    await this.delay(500)

    // Click post
    await this.page.click('[data-testid="tweetButton"]')
    await this.delay(2000)

    // Get the URL of the posted tweet
    const url = this.page.url()
    return url
  }

  async reply(targetUrl: string, content: string): Promise<string> {
    await this.page.goto(targetUrl, { waitUntil: 'networkidle0' })

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
      waitUntil: 'networkidle0',
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
