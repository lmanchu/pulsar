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
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    // Wait for page to stabilize
    await this.delay(3000)

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
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await this.delay(5000) // Wait longer for feed to fully load

    // Try multiple selectors for "Start a post" button
    const postButtonSelectors = [
      '[aria-label="Start a post"]',
      '[aria-label="Text"]', // Sometimes shows as "Text" button
      'button.share-box-feed-entry__trigger',
      '.share-box-feed-entry__top-bar button',
      '[data-control-name="share.share_box_input_text"]',
    ]

    let clicked = false
    for (const selector of postButtonSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 })
        await this.page.click(selector)
        clicked = true
        break
      } catch {
        continue
      }
    }

    if (!clicked) {
      throw new Error('Could not find post button on LinkedIn')
    }
    await this.delay(2000)

    // Wait for modal/editor - try multiple selectors
    const editorSelectors = [
      '.ql-editor',
      '[data-placeholder="What do you want to talk about?"]',
      '.editor-content[contenteditable="true"]',
      '[role="textbox"]',
    ]

    let editorSelector = ''
    for (const selector of editorSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 })
        editorSelector = selector
        break
      } catch {
        continue
      }
    }

    if (!editorSelector) {
      throw new Error('Could not find editor on LinkedIn')
    }
    await this.delay(500)

    // Type content
    await this.page.type(editorSelector, content, { delay: 20 })
    await this.delay(1000)

    // Click post button - try multiple selectors
    const submitSelectors = [
      '[aria-label="Post"]',
      'button.share-actions__primary-action',
      '[data-control-name="share.post"]',
      'button[type="submit"]',
    ]

    let submitClicked = false
    for (const selector of submitSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 3000 })
        await this.page.click(selector)
        submitClicked = true
        break
      } catch {
        continue
      }
    }

    if (!submitClicked) {
      throw new Error('Could not find submit button on LinkedIn')
    }

    // Wait for the post modal to close (post submitted)
    try {
      await this.page.waitForFunction(
        () => !document.querySelector('.share-box-feed-entry__closed-share-box') &&
              !document.querySelector('[aria-label="Post"]'),
        { timeout: 15000 }
      )
    } catch {
      // Check for error message
      const errorElement = await this.page.$('.artdeco-inline-feedback--error')
      if (errorElement) {
        const errorText = await errorElement.evaluate((el) => el.textContent)
        throw new Error(`LinkedIn post failed: ${errorText}`)
      }
      // Modal might have closed, continue
    }

    await this.delay(3000)

    // Navigate to activity page to get the post URL
    await this.page.goto('https://www.linkedin.com/in/me/recent-activity/all/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    await this.delay(3000)

    // Get the first post link (should be the just-posted one)
    const postLink = await this.page.$eval(
      '.feed-shared-update-v2 a[href*="/feed/update/"]',
      (el) => el.getAttribute('href')
    ).catch(() => null)

    if (postLink) {
      return postLink.startsWith('http') ? postLink : `https://www.linkedin.com${postLink}`
    }

    // Fallback: return activity page URL
    return 'https://www.linkedin.com/in/me/recent-activity/all/'
  }

  async comment(postUrl: string, content: string): Promise<string> {
    await this.page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await this.delay(2000)

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
      waitUntil: 'domcontentloaded',
      timeout: 60000,
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
