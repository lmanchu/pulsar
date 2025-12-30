import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { randomBytes } from 'crypto'

// POST: Generate a new connection token
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a random token
    const token = randomBytes(32).toString('hex')

    // Token expires in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    // Delete any existing tokens for this user
    await supabase
      .from('connection_tokens')
      .delete()
      .eq('user_id', user.id)

    // Create new token
    const { error } = await supabase
      .from('connection_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt,
      })

    if (error) {
      console.error('Error creating connection token:', error)
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
    }

    return NextResponse.json({
      token,
      expiresAt,
      expiresIn: 300, // 5 minutes in seconds
    })

  } catch (error) {
    console.error('Error generating connection token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get current token status
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get existing token
    const { data: tokenData } = await supabase
      .from('connection_tokens')
      .select('token, expires_at')
      .eq('user_id', user.id)
      .single()

    if (!tokenData) {
      return NextResponse.json({ hasToken: false })
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      await supabase.from('connection_tokens').delete().eq('user_id', user.id)
      return NextResponse.json({ hasToken: false })
    }

    return NextResponse.json({
      hasToken: true,
      token: tokenData.token,
      expiresAt: tokenData.expires_at,
    })

  } catch (error) {
    console.error('Error getting connection token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
