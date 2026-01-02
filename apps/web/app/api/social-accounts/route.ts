import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { encrypt } from '../../../lib/crypto'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('social_accounts')
      .select('id, platform, username, display_name, avatar_url, is_active, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching social accounts:', error)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    return NextResponse.json({ accounts: data })
  } catch (error) {
    console.error('Error in GET /api/social-accounts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, username, credentials } = body

    if (!platform || !username || !credentials) {
      return NextResponse.json(
        { error: 'Missing required fields: platform, username, credentials' },
        { status: 400 }
      )
    }

    if (!['twitter', 'linkedin', 'threads'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be twitter, linkedin, or threads' },
        { status: 400 }
      )
    }

    // Encrypt credentials
    const encryptedCredentials = encrypt(credentials)

    // Check if account already exists
    const { data: existing } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('username', username)
      .single()

    if (existing) {
      // Update existing account
      const { data, error } = await supabase
        .from('social_accounts')
        .update({
          encrypted_credentials: encryptedCredentials,
          is_active: true,
        })
        .eq('id', existing.id)
        .select('id, platform, username, display_name, avatar_url, is_active, last_used_at, created_at')
        .single()

      if (error) {
        console.error('Error updating social account:', error)
        return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
      }

      return NextResponse.json({ account: data, updated: true })
    }

    // Create new account
    const { data, error } = await supabase
      .from('social_accounts')
      .insert({
        user_id: user.id,
        platform,
        platform_user_id: username,
        username,
        encrypted_credentials: encryptedCredentials,
        is_active: true,
      })
      .select('id, platform, username, display_name, avatar_url, is_active, last_used_at, created_at')
      .single()

    if (error) {
      console.error('Error creating social account:', error)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    return NextResponse.json({ account: data, created: true }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/social-accounts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
