/**
 * Simple test - just try to type into Threads
 */

import { chromium } from 'playwright'
import path from 'path'

const USER_DATA_DIR = path.join(process.env.HOME || '', '.pulsar/browser-data/threads-test')

async function testThreadsInput() {
  console.log('Launching browser...')

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  })

  const page = context.pages()[0] || await context.newPage()

  console.log('Navigating to Threads...')
  await page.goto('https://www.threads.com', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)

  // Take a screenshot to see current state
  await page.screenshot({ path: '/tmp/threads-test-1.png' })
  console.log('Screenshot saved to /tmp/threads-test-1.png')

  // Try to find and click the create/compose button
  console.log('Looking for compose button...')

  // Try multiple selectors
  const composeSelectors = [
    'svg[aria-label="新增貼文"]',
    'svg[aria-label="New post"]',
    'svg[aria-label="Create"]',
    '[aria-label="新增貼文"]',
    '[aria-label="New post"]',
    '[aria-label="Create"]',
    // Also try the parent elements
    'div[role="button"]:has(svg[aria-label])',
  ]

  let clicked = false
  for (const selector of composeSelectors) {
    try {
      const el = page.locator(selector).first()
      if (await el.isVisible({ timeout: 1000 })) {
        console.log(`Found compose button with selector: ${selector}`)
        await el.click()
        clicked = true
        break
      }
    } catch (e) {
      // Try next selector
    }
  }

  if (!clicked) {
    console.log('Could not find compose button. Taking screenshot...')
    await page.screenshot({ path: '/tmp/threads-test-2.png' })
    console.log('Screenshot saved to /tmp/threads-test-2.png')
    console.log('Check the screenshots to see the page state.')
    await page.waitForTimeout(30000)
    await context.close()
    return
  }

  await page.waitForTimeout(1500)

  // Take screenshot after clicking compose
  await page.screenshot({ path: '/tmp/threads-test-3.png' })
  console.log('Screenshot after clicking compose: /tmp/threads-test-3.png')

  // Find the text input area
  console.log('Looking for text input...')
  const textInput = page.locator('[contenteditable="true"]').first()

  try {
    await textInput.waitFor({ state: 'visible', timeout: 5000 })
    console.log('✓ Found text input!')

    // Click and type
    await textInput.click()
    await page.waitForTimeout(300)

    const testMessage = `🚀 Playwright 測試成功！ ${new Date().toLocaleTimeString()}`
    console.log(`Typing: "${testMessage}"`)

    // Use pressSequentially - this is the key!
    await textInput.pressSequentially(testMessage, { delay: 30 })

    await page.waitForTimeout(500)
    await page.screenshot({ path: '/tmp/threads-test-4.png' })
    console.log('\n✅ SUCCESS! Screenshot saved to /tmp/threads-test-4.png')
    console.log('Check the browser - text should be in the compose box!')

  } catch (e) {
    console.log('Could not find text input:', e)
    await page.screenshot({ path: '/tmp/threads-test-error.png' })
  }

  // Keep browser open for 30 seconds
  console.log('\nBrowser will stay open for 30 seconds...')
  await page.waitForTimeout(30000)

  await context.close()
  console.log('Done!')
}

testThreadsInput().catch(console.error)
