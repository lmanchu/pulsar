import { Page } from 'playwright'
import { browserManager } from '../browser-manager'

export interface PostResult {
  success: boolean
  postUrl?: string
  error?: string
}

export async function postToTwitter(content: string): Promise<PostResult> {
  let page: Page | null = null

  try {
    page = await browserManager.getPage('twitter')

    // Navigate to Twitter compose
    await page.goto('https://x.com/compose/tweet', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Wait for the compose area
    const textEditor = page.locator('[data-testid="tweetTextarea_0"]').first()
    await textEditor.waitFor({ state: 'visible', timeout: 5000 })

    // Click and type
    await textEditor.click()
    await page.waitForTimeout(300)

    // Twitter uses Draft.js, pressSequentially works well
    await textEditor.pressSequentially(content, { delay: 10 })
    await page.waitForTimeout(500)

    // Click the Post button
    const postButton = page.locator('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]').first()
    await postButton.click()
    await page.waitForTimeout(3000)

    // Wait for redirect to the posted tweet
    await page.waitForURL(/\/status\//, { timeout: 10000 }).catch(() => {})

    return {
      success: true,
      postUrl: page.url(),
    }
  } catch (error) {
    console.error('Twitter posting error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function replyToTwitter(targetUrl: string, content: string): Promise<PostResult> {
  let page: Page | null = null

  try {
    page = await browserManager.getPage('twitter')

    // Navigate to the target tweet
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Find the reply input
    const replyInput = page.locator('[data-testid="tweetTextarea_0"]').first()
    await replyInput.waitFor({ state: 'visible', timeout: 5000 })

    // Click and type
    await replyInput.click()
    await page.waitForTimeout(300)
    await replyInput.pressSequentially(content, { delay: 10 })
    await page.waitForTimeout(500)

    // Click the Reply button
    const replyButton = page.locator('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]').first()
    await replyButton.click()
    await page.waitForTimeout(3000)

    return {
      success: true,
      postUrl: page.url(),
    }
  } catch (error) {
    console.error('Twitter reply error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
