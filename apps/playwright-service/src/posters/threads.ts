import { Page } from 'playwright'
import { browserManager } from '../browser-manager'

export interface PostResult {
  success: boolean
  postUrl?: string
  error?: string
}

export async function postToThreads(content: string): Promise<PostResult> {
  let page: Page | null = null

  try {
    page = await browserManager.getPage('threads')

    // Navigate to Threads home
    await page.goto('https://www.threads.com', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Click the create/compose button
    // Threads has different labels based on language
    const createButton = page.locator([
      'svg[aria-label="新增貼文"]',
      'svg[aria-label="New post"]',
      'svg[aria-label="Create"]',
      '[aria-label="新增貼文"]',
      '[aria-label="New post"]',
    ].join(', ')).first()

    await createButton.click()
    await page.waitForTimeout(1000)

    // Wait for the compose modal to appear
    // The contenteditable div for text input
    const textInput = page.locator('[contenteditable="true"][role="textbox"]').first()
    await textInput.waitFor({ state: 'visible', timeout: 5000 })

    // Use Playwright's fill method - this triggers proper React events!
    await textInput.click()
    await page.waitForTimeout(300)

    // For contenteditable, we need to use keyboard input
    await textInput.pressSequentially(content, { delay: 20 })
    await page.waitForTimeout(500)

    // Find and click the Post button
    const postButton = page.locator([
      'div[role="button"]:has-text("發佈")',
      'div[role="button"]:has-text("Post")',
      'button:has-text("發佈")',
      'button:has-text("Post")',
    ].join(', ')).first()

    await postButton.click()
    await page.waitForTimeout(3000)

    // Wait for post to complete (modal closes or URL changes)
    // Try to get the post URL from the response or current URL
    const currentUrl = page.url()

    return {
      success: true,
      postUrl: currentUrl,
    }
  } catch (error) {
    console.error('Threads posting error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function replyToThreads(targetUrl: string, content: string): Promise<PostResult> {
  let page: Page | null = null

  try {
    page = await browserManager.getPage('threads')

    // Navigate to the target post
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Find the reply input area
    const replyInput = page.locator('[contenteditable="true"][role="textbox"]').first()
    await replyInput.waitFor({ state: 'visible', timeout: 5000 })

    // Click and type using pressSequentially for React compatibility
    await replyInput.click()
    await page.waitForTimeout(300)
    await replyInput.pressSequentially(content, { delay: 20 })
    await page.waitForTimeout(500)

    // Find and click the Reply/Post button
    const replyButton = page.locator([
      'div[role="button"]:has-text("回覆")',
      'div[role="button"]:has-text("Reply")',
      'div[role="button"]:has-text("Post")',
    ].join(', ')).first()

    await replyButton.click()
    await page.waitForTimeout(3000)

    return {
      success: true,
      postUrl: page.url(),
    }
  } catch (error) {
    console.error('Threads reply error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
