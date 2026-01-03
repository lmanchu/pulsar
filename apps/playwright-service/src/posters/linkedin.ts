import { Page } from 'playwright'
import { browserManager } from '../browser-manager'

export interface PostResult {
  success: boolean
  postUrl?: string
  error?: string
}

export async function postToLinkedIn(content: string): Promise<PostResult> {
  let page: Page | null = null

  try {
    page = await browserManager.getPage('linkedin')

    // Navigate to LinkedIn home
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Click the "Start a post" button
    const startPostButton = page.locator([
      'button.share-box-feed-entry__trigger',
      '[data-control-name="share.sharebox_trigger"]',
      'button:has-text("Start a post")',
      'button:has-text("開始發文")',
    ].join(', ')).first()

    await startPostButton.click()
    await page.waitForTimeout(1500)

    // Wait for the post modal to appear
    const textEditor = page.locator([
      '.ql-editor[contenteditable="true"]',
      '[role="textbox"][contenteditable="true"]',
      '.share-creation-state__text-editor .ql-editor',
    ].join(', ')).first()

    await textEditor.waitFor({ state: 'visible', timeout: 5000 })

    // Click and type - LinkedIn uses Quill editor
    await textEditor.click()
    await page.waitForTimeout(300)

    // Use pressSequentially for React/Quill compatibility
    await textEditor.pressSequentially(content, { delay: 15 })
    await page.waitForTimeout(500)

    // Click the Post button
    const postButton = page.locator([
      'button.share-actions__primary-action',
      'button:has-text("Post")',
      'button:has-text("發佈")',
    ].join(', ')).first()

    await postButton.click()
    await page.waitForTimeout(3000)

    // Wait for the modal to close
    await page.waitForSelector('.share-box-feed-entry__trigger', { state: 'visible', timeout: 10000 })

    return {
      success: true,
      postUrl: 'https://www.linkedin.com/feed/',
    }
  } catch (error) {
    console.error('LinkedIn posting error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function replyToLinkedIn(targetUrl: string, content: string): Promise<PostResult> {
  let page: Page | null = null

  try {
    page = await browserManager.getPage('linkedin')

    // Navigate to the target post
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Find and click the comment button or input
    const commentInput = page.locator([
      '.comments-comment-box__text-editor .ql-editor',
      '[placeholder*="Add a comment"]',
      '[placeholder*="留言"]',
    ].join(', ')).first()

    // If comment box is collapsed, click to expand
    const commentButton = page.locator('button.comment-button, button[aria-label*="Comment"]').first()
    if (await commentButton.isVisible()) {
      await commentButton.click()
      await page.waitForTimeout(1000)
    }

    await commentInput.waitFor({ state: 'visible', timeout: 5000 })
    await commentInput.click()
    await page.waitForTimeout(300)

    // Type the comment
    await commentInput.pressSequentially(content, { delay: 15 })
    await page.waitForTimeout(500)

    // Click the Post/Submit button
    const submitButton = page.locator([
      'button.comments-comment-box__submit-button',
      'button:has-text("Post")',
      'button:has-text("發佈")',
    ].join(', ')).first()

    await submitButton.click()
    await page.waitForTimeout(2000)

    return {
      success: true,
      postUrl: targetUrl,
    }
  } catch (error) {
    console.error('LinkedIn reply error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
