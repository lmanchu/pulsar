import type { Page } from 'puppeteer'

import type { SessionCookie } from './twitter.js'

export interface ThreadsCredentials {
  username: string
  password: string
}

export class ThreadsAutomation {
  private page: Page
  private loggedIn = false

  constructor(page: Page) {
    this.page = page
  }

  async loginWithCookies(cookies: SessionCookie[]): Promise<void> {
    if (this.loggedIn) return

    // Threads uses Instagram authentication, set cookies for both domains
    const threadsCookies = cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain || '.threads.net',
      path: c.path || '/',
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure ?? true,
      sameSite: c.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
    }))

    await this.page.setCookie(...threadsCookies)

    // Navigate to home to verify session
    await this.page.goto('https://www.threads.net/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await this.delay(3000)

    // Check if we're actually logged in by looking for profile link
    const isLoggedIn = await this.page.evaluate(() => {
      return !!document.querySelector('a[href*="/@"]')
    })

    if (!isLoggedIn) {
      // Check if redirected to login
      const currentUrl = this.page.url()
      if (currentUrl.includes('/login') || currentUrl.includes('instagram.com')) {
        throw new Error('Session cookies expired or invalid')
      }
      throw new Error('Session cookies expired or invalid')
    }

    this.loggedIn = true
  }

  async login(credentials: ThreadsCredentials): Promise<void> {
    if (this.loggedIn) return

    // Threads uses Instagram login
    await this.page.goto('https://www.threads.net/login', {
      waitUntil: 'networkidle0',
      timeout: 60000,
    })

    // Wait for Instagram login form
    await this.page.waitForSelector('input[name="username"]', { timeout: 10000 })
    await this.page.type('input[name="username"]', credentials.username, { delay: 50 })

    await this.page.type('input[name="password"]', credentials.password, { delay: 50 })

    // Click login button
    await this.page.click('button[type="submit"]')
    await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 })

    this.loggedIn = true
  }

  async post(content: string): Promise<string> {
    await this.page.goto('https://www.threads.net/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await this.delay(3000)

    // Click on the composer to open it (the "What's new?" button)
    const composerButtonSelectors = [
      'button[aria-label*="撰寫"]',
      'button[aria-label*="Write"]',
      'button[aria-label*="新貼文"]',
      '[role="button"][tabindex="0"]',
    ]

    // First try to find and click the inline composer
    let composerOpened = false
    try {
      // Look for the text input area directly on the page
      const inlineComposer = await this.page.$('[role="textbox"][contenteditable="true"]')
      if (inlineComposer) {
        await inlineComposer.click()
        composerOpened = true
      }
    } catch {
      // Try button selectors
      for (const selector of composerButtonSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 3000 })
          await this.page.click(selector)
          composerOpened = true
          break
        } catch {
          continue
        }
      }
    }

    if (!composerOpened) {
      // Try clicking on the "+" button or create post button
      const createButton = await this.page.$('svg[aria-label="建立"], svg[aria-label="Create"]')
      if (createButton) {
        await createButton.click()
        composerOpened = true
      }
    }

    await this.delay(1500)

    // Wait for the textbox to be ready
    const textboxSelector = '[role="textbox"][contenteditable="true"]'
    await this.page.waitForSelector(textboxSelector, { timeout: 10000 })
    await this.delay(500)

    // Type content into the composer
    // Threads uses contenteditable div, so we need to use keyboard input
    await this.page.focus(textboxSelector)
    await this.delay(200)

    // Type the content
    await this.page.keyboard.type(content, { delay: 20 })
    await this.delay(1000)

    // Find and click the post button
    // Threads uses "發佈" (Traditional Chinese) or "Post" (English)
    const postButtonClicked = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"], button'))
      for (const btn of buttons) {
        const text = btn.textContent?.trim()
        if (text === '發佈' || text === 'Post' || text === '發布') {
          ;(btn as HTMLElement).click()
          return true
        }
      }
      return false
    })

    if (!postButtonClicked) {
      throw new Error('Could not find post button on Threads')
    }

    // Wait for the post to be submitted (composer should close)
    try {
      await this.page.waitForFunction(
        () => {
          const dialogs = document.querySelectorAll('[role="dialog"]')
          const textboxes = document.querySelectorAll('[role="textbox"][contenteditable="true"]')
          // Either no dialog or textbox is empty/gone
          return dialogs.length === 0 || textboxes.length === 0 ||
            Array.from(textboxes).every(t => !t.textContent?.trim())
        },
        { timeout: 20000 }
      )
    } catch {
      // Check for error message
      const errorText = await this.page.evaluate(() => {
        const error = document.querySelector('[role="alert"]')
        return error?.textContent || null
      })
      if (errorText) {
        throw new Error(`Threads post failed: ${errorText}`)
      }
      // Post might have succeeded, continue
    }

    await this.delay(3000)

    // Navigate to profile to get the post URL
    const username = await this.page.evaluate(() => {
      const profileLink = document.querySelector('a[href^="/@"]')
      return profileLink?.getAttribute('href')?.replace('/@', '') || null
    })

    if (username) {
      await this.page.goto(`https://www.threads.net/@${username}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      await this.delay(2000)

      // Get the first post link
      const postLink = await this.page.$eval(
        'a[href*="/post/"]',
        (el) => el.getAttribute('href')
      ).catch(() => null)

      if (postLink) {
        return postLink.startsWith('http') ? postLink : `https://www.threads.net${postLink}`
      }
    }

    // Fallback: return home URL
    return 'https://www.threads.net/'
  }

  async reply(postUrl: string, content: string): Promise<string> {
    await this.page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await this.delay(2000)

    // Click reply button or the reply composer
    const replyButtonSelectors = [
      '[aria-label*="回覆"]',
      '[aria-label*="Reply"]',
      '[aria-label*="Comment"]',
      'svg[aria-label*="回覆"]',
    ]

    let replyOpened = false
    for (const selector of replyButtonSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 3000 })
        await this.page.click(selector)
        replyOpened = true
        break
      } catch {
        continue
      }
    }

    if (!replyOpened) {
      throw new Error('Could not find reply button on Threads')
    }

    await this.delay(1000)

    // Wait for reply textbox
    const textboxSelector = '[role="textbox"][contenteditable="true"]'
    await this.page.waitForSelector(textboxSelector, { timeout: 10000 })
    await this.delay(500)

    // Type reply
    await this.page.focus(textboxSelector)
    await this.page.keyboard.type(content, { delay: 20 })
    await this.delay(500)

    // Click reply/post button
    const replySubmitted = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"], button'))
      for (const btn of buttons) {
        const text = btn.textContent?.trim()
        if (text === '發佈' || text === 'Post' || text === '回覆' || text === 'Reply') {
          ;(btn as HTMLElement).click()
          return true
        }
      }
      return false
    })

    if (!replySubmitted) {
      throw new Error('Could not find reply submit button on Threads')
    }

    await this.delay(2000)

    return this.page.url()
  }

  async getLatestPosts(profileUrl: string, count = 5): Promise<string[]> {
    // Normalize profile URL
    const url = profileUrl.includes('threads.net')
      ? profileUrl
      : `https://www.threads.net/@${profileUrl.replace('@', '')}`

    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await this.delay(2000)

    // Get post texts from the profile
    const posts = await this.page.evaluate((limit) => {
      const postElements = document.querySelectorAll('[data-pressable-container="true"]')
      const texts: string[] = []

      for (const el of Array.from(postElements).slice(0, limit)) {
        // Find text content within the post
        const textEl = el.querySelector('span[dir="auto"]')
        if (textEl?.textContent) {
          texts.push(textEl.textContent.trim())
        }
      }

      return texts
    }, count)

    return posts
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
