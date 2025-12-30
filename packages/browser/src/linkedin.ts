import type { Page } from 'puppeteer'

import type { SessionCookie } from './twitter.js'

export interface LinkedInCredentials {
  email: string
  password: string
}

export class LinkedInAutomation {
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
        domain: c.domain || '.linkedin.com',
        path: c.path || '/',
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure ?? true,
        sameSite: c.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
      }))
    )

    // Navigate to feed to verify session
    await this.page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'networkidle0',
    })

    // Check if we're actually logged in
    const currentUrl = this.page.url()
    if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint')) {
      throw new Error('Session cookies expired or invalid')
    }

    this.loggedIn = true
  }

  async login(credentials: LinkedInCredentials): Promise<void> {
    if (this.loggedIn) return

    await this.page.goto('https://www.linkedin.com/login', {
      waitUntil: 'networkidle0',
    })

    // Enter email
    await this.page.waitForSelector('#username')
    await this.page.type('#username', credentials.email, { delay: 50 })

    // Enter password
    await this.page.type('#password', credentials.password, { delay: 50 })

    // Click login
    await this.page.click('[type="submit"]')
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' })

    this.loggedIn = true
  }

  async post(content: string): Promise<string> {
    await this.page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'networkidle0',
    })

    // Click "Start a post" button
    await this.page.waitForSelector('[aria-label="Start a post"]')
    await this.page.click('[aria-label="Start a post"]')
    await this.delay(1000)

    // Wait for modal
    await this.page.waitForSelector('.ql-editor')
    await this.delay(500)

    // Type content
    await this.page.type('.ql-editor', content, { delay: 20 })
    await this.delay(500)

    // Click post button
    await this.page.click('[aria-label="Post"]')
    await this.delay(3000)

    return this.page.url()
  }

  async comment(postUrl: string, content: string): Promise<string> {
    await this.page.goto(postUrl, { waitUntil: 'networkidle0' })

    // Click comment button to expand
    await this.page.waitForSelector('[aria-label*="Comment"]')
    await this.page.click('[aria-label*="Comment"]')
    await this.delay(500)

    // Wait for comment input
    await this.page.waitForSelector('.comments-comment-box__form .ql-editor')
    await this.delay(500)

    // Type comment
    await this.page.type('.comments-comment-box__form .ql-editor', content, {
      delay: 20,
    })
    await this.delay(500)

    // Submit comment
    await this.page.click('.comments-comment-box__submit-button')
    await this.delay(2000)

    return this.page.url()
  }

  async getLatestPosts(profileUrl: string, count = 5): Promise<string[]> {
    await this.page.goto(`${profileUrl}/recent-activity/all/`, {
      waitUntil: 'networkidle0',
    })

    await this.delay(2000)

    // Get post texts
    const posts = await this.page.$$eval(
      '.feed-shared-update-v2__description',
      (elements, limit) =>
        elements.slice(0, limit).map((el) => el.textContent?.trim() || ''),
      count
    )

    return posts
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
