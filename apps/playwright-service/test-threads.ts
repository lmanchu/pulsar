/**
 * Quick test script to verify Playwright can type into Threads
 * Run with: npx tsx test-threads.ts
 */

import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'

const USER_DATA_DIR = path.join(process.env.HOME || '', '.pulsar/browser-data/threads-test')

async function testThreadsInput() {
  // Ensure directory exists
  fs.mkdirSync(USER_DATA_DIR, { recursive: true })

  console.log('Launching browser with persistent context...')
  console.log('User data dir:', USER_DATA_DIR)

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  })

  const page = context.pages()[0] || await context.newPage()

  console.log('Navigating to Threads...')
  await page.goto('https://www.threads.com', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)

  // Check if logged in by looking for create button
  const createButton = page.locator([
    'svg[aria-label="新增貼文"]',
    'svg[aria-label="New post"]',
    '[aria-label="新增貼文"]',
    '[aria-label="New post"]',
  ].join(', ')).first()

  const isVisible = await createButton.isVisible().catch(() => false)

  if (!isVisible) {
    console.log('\n⚠️  Not logged in! Please log in manually in the browser window.')
    console.log('After logging in, close the browser and run this script again.\n')

    // Keep browser open for manual login
    await page.waitForTimeout(60000 * 5) // Wait 5 minutes for login
    await context.close()
    return
  }

  console.log('✓ Logged in! Testing text input...')

  // Click create button
  await createButton.click()
  await page.waitForTimeout(1500)

  // Find the text input
  const textInput = page.locator('[contenteditable="true"][role="textbox"]').first()
  await textInput.waitFor({ state: 'visible', timeout: 5000 })

  console.log('✓ Found text input. Typing test message...')

  // This is the key test - using pressSequentially instead of fill()
  const testMessage = `Test post from Playwright! 🚀 ${new Date().toISOString()}`
  await textInput.click()
  await page.waitForTimeout(300)
  await textInput.pressSequentially(testMessage, { delay: 30 })

  console.log('✓ Text typed successfully!')
  console.log('\nCheck the browser - you should see the text in the compose box.')
  console.log('Press Ctrl+C to close the browser without posting.\n')

  // Keep browser open so user can see the result
  await page.waitForTimeout(60000) // Wait 1 minute

  await context.close()
  console.log('Browser closed.')
}

testThreadsInput().catch(console.error)
