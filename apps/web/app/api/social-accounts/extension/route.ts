import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { encrypt } from '../../../../lib/crypto'

interface SessionCookie {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: string
}

interface AccountPayload {
  platform: 'twitter' | 'linkedin'
  cookies: SessionCookie[]
}

interface ExtensionPayload {
  token: string
  accounts: AccountPayload[]
}

// CORS headers for browser extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Helper to create JSON response with CORS headers
function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders })
}

// OPTIONS: Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// POST: Receive cookies from browser extension
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ExtensionPayload = await request.json()
    const { token, accounts } = body

    if (!token) {
      return jsonResponse({ error: 'Token required' }, 400)
    }

    if (!accounts || accounts.length === 0) {
      return jsonResponse({ error: 'No accounts provided' }, 400)
    }

    // Validate token and get user (use admin client to bypass RLS)
    const supabase = createAdminClient()

    // Look up the connection token
    const { data: tokenData, error: tokenError } = await supabase
      .from('connection_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401)
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      // Delete expired token
      await supabase.from('connection_tokens').delete().eq('token', token)
      return jsonResponse({ error: 'Token expired' }, 401)
    }

    const userId = tokenData.user_id

    // Process each account
    const results = []
    for (const account of accounts) {
      const { platform, cookies } = account

      if (!['twitter', 'linkedin'].includes(platform)) {
        results.push({ platform, success: false, error: 'Invalid platform' })
        continue
      }

      if (!cookies || cookies.length === 0) {
        results.push({ platform, success: false, error: 'No cookies provided' })
        continue
      }

      // Encrypt cookies
      const encryptedCookies = encrypt({ cookies })

      // Try to get username from cookies
      let username = `${platform}_user`
      if (platform === 'twitter') {
        const twidCookie = cookies.find(c => c.name === 'twid')
        if (twidCookie) {
          // twid format is usually u%3D{user_id}
          const match = twidCookie.value.match(/u%3D(\d+)/)
          if (match) {
            username = `twitter_${match[1]}`
          }
        }
      }

      // Check if account already exists
      const { data: existing } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', platform)
        .single()

      if (existing) {
        // Update existing account
        const { error } = await supabase
          .from('social_accounts')
          .update({
            encrypted_cookies: encryptedCookies,
            auth_method: 'session',
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (error) {
          console.error(`Error updating ${platform} account:`, error)
          results.push({ platform, success: false, error: 'Database error' })
        } else {
          results.push({ platform, success: true, action: 'updated' })
        }
      } else {
        // Create new account
        const { error } = await supabase
          .from('social_accounts')
          .insert({
            user_id: userId,
            platform,
            platform_user_id: username,
            username,
            encrypted_cookies: encryptedCookies,
            auth_method: 'session',
            is_active: true,
          })

        if (error) {
          console.error(`Error creating ${platform} account:`, error)
          results.push({ platform, success: false, error: 'Database error' })
        } else {
          results.push({ platform, success: true, action: 'created' })
        }
      }
    }

    // Extend token expiry for WebSocket connection (24 hours)
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('connection_tokens')
      .update({ expires_at: newExpiresAt })
      .eq('token', token)

    const successCount = results.filter(r => r.success).length
    return jsonResponse({
      success: successCount > 0,
      message: `Connected ${successCount} of ${results.length} account(s)`,
      results
    })

  } catch (error) {
    console.error('Error processing extension request:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
