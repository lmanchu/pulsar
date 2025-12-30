import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: Get a single persona by ID
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: persona, error } = await supabase
      .from('personas')
      .select(`
        *,
        social_accounts (
          id,
          platform,
          username
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    return NextResponse.json({ persona })
  } catch (error) {
    console.error('Error in GET /api/personas/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update a persona
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify persona belongs to user
    const { data: existing, error: existingError } = await supabase
      .from('personas')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
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

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (bio !== undefined) updateData.bio = bio
    if (tone !== undefined) updateData.tone = tone
    if (topics !== undefined) updateData.topics = topics
    if (platform !== undefined) updateData.platform = platform
    if (avoid_phrases !== undefined) updateData.avoid_phrases = avoid_phrases
    if (example_posts !== undefined) updateData.example_posts = example_posts
    if (is_active !== undefined) updateData.is_active = is_active
    if (social_account_id !== undefined) updateData.social_account_id = social_account_id

    const { data: persona, error } = await supabase
      .from('personas')
      .update(updateData)
      .eq('id', id)
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
      console.error('Error updating persona:', error)
      return NextResponse.json({ error: 'Failed to update persona' }, { status: 500 })
    }

    return NextResponse.json({ persona })
  } catch (error) {
    console.error('Error in PUT /api/personas/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a persona
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify persona belongs to user and delete
    const { error } = await supabase
      .from('personas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting persona:', error)
      return NextResponse.json({ error: 'Failed to delete persona' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/personas/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
