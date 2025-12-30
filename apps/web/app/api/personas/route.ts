import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

// GET: List all personas for the current user
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: personas, error } = await supabase
      .from('personas')
      .select(`
        *,
        social_accounts (
          id,
          platform,
          username
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching personas:', error)
      return NextResponse.json({ error: 'Failed to fetch personas' }, { status: 500 })
    }

    return NextResponse.json({ personas })
  } catch (error) {
    console.error('Error in GET /api/personas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new persona
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      social_account_id,
      name,
      bio,
      tone,
      topics,
      platform,
      avoid_phrases,
      example_posts,
      is_active,
    } = body

    // Validate required fields
    if (!name || !platform) {
      return NextResponse.json(
        { error: 'Name and platform are required' },
        { status: 400 }
      )
    }

    // If social_account_id provided, verify it belongs to user
    if (social_account_id) {
      const { data: account, error: accountError } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('id', social_account_id)
        .eq('user_id', user.id)
        .single()

      if (accountError || !account) {
        return NextResponse.json(
          { error: 'Invalid social account' },
          { status: 400 }
        )
      }
    }

    const { data: persona, error } = await supabase
      .from('personas')
      .insert({
        user_id: user.id,
        social_account_id: social_account_id || null,
        name,
        bio: bio || null,
        tone: tone || null,
        topics: topics || [],
        platform,
        avoid_phrases: avoid_phrases || [],
        example_posts: example_posts || [],
        is_active: is_active !== false,
      })
      .select(`
        *,
        social_accounts (
          id,
          platform,
          username
        )
      `)
      .single()

    if (error) {
      console.error('Error creating persona:', error)
      return NextResponse.json({ error: 'Failed to create persona' }, { status: 500 })
    }

    return NextResponse.json({ persona }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/personas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
