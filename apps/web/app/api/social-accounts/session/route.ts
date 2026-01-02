import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { encrypt } from '../../../../lib/crypto'
import puppeteer, { Browser, Page } from 'puppeteer'

// Store active sessions
const activeSessions = new Map<string, { browser: Browser; page: Page; platform: string }>()

const LOGIN_URLS = {
  twitter: 'https://twitter.com/i/flow/login',
  linkedin: 'https://www.linkedin.com/login',
  threads: 'https://www.threads.net/login',
}

const AUTH_CHECK_URLS = {
  twitter: 'https://twitter.com/home',
  linkedin: 'https://www.linkedin.com/feed/',
  threads: 'https://www.threads.net/',
}

// POST: Start a new browser session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform } = body

    if (!platform || !['twitter', 'linkedin', 'threads'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Create session ID
    const sessionId = `${user.id}-${platform}-${Date.now()}`

    // Launch browser in headful mode
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 800 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    })

    const page = await browser.newPage()

    // Set user agent to avoid detection
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // Navigate to login page
    await page.goto(LOGIN_URLS[platform as keyof typeof LOGIN_URLS], {
      waitUntil: 'networkidle2',
    })

    // Store session
    activeSessions.set(sessionId, { browser, page, platform })

    // Set timeout to clean up session after 5 minutes
    setTimeout(async () => {
      const session = activeSessions.get(sessionId)
      if (session) {
        try {
          await session.browser.close()
        } catch {
          // Ignore errors
        }
        activeSessions.delete(sessionId)
      }
    }, 5 * 60 * 1000)

    return NextResponse.json({ sessionId })
  } catch (error) {
    console.error('Error starting browser session:', error)
    return NextResponse.json({ error: 'Failed to start browser session' }, { status: 500 })
  }
}

// GET: Check session status and capture cookies if logged in
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const session = activeSessions.get(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 })
    }

    const { browser, page, platform } = session

    try {
      // Check current URL
      const currentUrl = page.url()
      const authCheckUrl = AUTH_CHECK_URLS[platform as keyof typeof AUTH_CHECK_URLS]

      // Check if user has logged in (redirected to home/feed)
      const domain = authCheckUrl.replace('https://', '').split('/')[0] || ''
      const isLoggedIn = currentUrl.includes(domain) &&
        (currentUrl.includes('/home') || currentUrl.includes('/feed'))

      if (!isLoggedIn) {
        // Also check for specific cookies
        const cookies = await page.cookies()
        const authCookies = platform === 'twitter'
          ? cookies.filter(c => c.name === 'auth_token' || c.name === 'ct0')
          : platform === 'threads'
          ? cookies.filter(c => c.name === 'sessionid' || c.name === 'csrftoken')
          : cookies.filter(c => c.name === 'li_at' || c.name === 'JSESSIONID')

        if (authCookies.length < 2) {
          return NextResponse.json({ status: 'waiting', currentUrl })
        }
      }

      // User is logged in, capture cookies
      const cookies = await page.cookies()

      // Get username from page
      let username = ''
      if (platform === 'twitter') {
        try {
          // Try to get username from Twitter
          await page.goto('https://twitter.com/settings/account', { waitUntil: 'networkidle2', timeout: 10000 })
          username = await page.$eval('input[name="username"]', (el) => (el as HTMLInputElement).value).catch(() => '')
          if (!username) {
            // Try getting from profile link
            const profileLink = await page.$eval('a[data-testid="AppTabBar_Profile_Link"]', (el) => el.getAttribute('href')).catch(() => '')
            if (profileLink) {
              username = profileLink.replace('/', '')
            }
          }
        } catch {
          username = 'twitter_user'
        }
      } else if (platform === 'threads') {
        try {
          // Try to get username from Threads profile link
          const profileLink = await page.$eval('a[href^="/@"]', (el) => el.getAttribute('href')).catch(() => '')
          if (profileLink) {
            username = profileLink.replace('/@', '')
          }
        } catch {
          username = 'threads_user'
        }
      } else {
        try {
          // Try to get name from LinkedIn
          await page.goto('https://www.linkedin.com/in/', { waitUntil: 'networkidle2', timeout: 10000 })
          const currentUrlAfter = page.url()
          if (currentUrlAfter.includes('/in/')) {
            username = currentUrlAfter.split('/in/')[1]?.replace('/', '') || 'linkedin_user'
          }
        } catch {
          username = 'linkedin_user'
        }
      }

      // Filter relevant cookies
      const relevantCookies = platform === 'twitter'
        ? cookies.filter(c => ['auth_token', 'ct0', 'twid', 'personalization_id'].includes(c.name))
        : platform === 'threads'
        ? cookies.filter(c => ['sessionid', 'csrftoken', 'ds_user_id', 'mid', 'ig_did', 'ig_nrcb'].includes(c.name))
        : cookies.filter(c => ['li_at', 'JSESSIONID', 'liap', 'li_mc'].includes(c.name))

      // Close browser
      await browser.close()
      activeSessions.delete(sessionId)

      // Encrypt and store cookies
      const encryptedCookies = encrypt({ cookies: relevantCookies })

      // Check if account already exists
      const { data: existing } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', platform)
        .single()

      if (existing) {
        // Update existing account
        const { error } = await supabase
          .from('social_accounts')
          .update({
            username: username || existing.id,
            encrypted_cookies: encryptedCookies,
            auth_method: 'session',
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (error) {
          console.error('Error updating social account:', error)
          return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
        }
      } else {
        // Create new account
        const { error } = await supabase
          .from('social_accounts')
          .insert({
            user_id: user.id,
            platform,
            platform_user_id: username,
            username: username || `${platform}_user`,
            encrypted_cookies: encryptedCookies,
            auth_method: 'session',
            is_active: true,
          })

        if (error) {
          console.error('Error creating social account:', error)
          return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
        }
      }

      return NextResponse.json({ status: 'success', username })
    } catch (error) {
      console.error('Error checking session:', error)
      return NextResponse.json({ status: 'waiting', error: 'Checking...' })
    }
  } catch (error) {
    console.error('Error in GET /api/social-accounts/session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Cancel/close a session
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const session = activeSessions.get(sessionId)
    if (session) {
      try {
        await session.browser.close()
      } catch {
        // Ignore errors
      }
      activeSessions.delete(sessionId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error closing session:', error)
    return NextResponse.json({ error: 'Failed to close session' }, { status: 500 })
  }
}
