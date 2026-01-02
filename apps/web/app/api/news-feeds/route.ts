import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

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
      .from('news_feeds')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching news feeds:', error)
      return NextResponse.json({ error: 'Failed to fetch feeds' }, { status: 500 })
    }

    return NextResponse.json({ feeds: data })
  } catch (error) {
    console.error('Error in GET /api/news-feeds:', error)
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
    const { name, url, category, priority, is_enabled } = body

    if (!name || !url) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('news_feeds')
      .insert({
        user_id: user.id,
        name,
        url,
        category: category || 'general',
        priority: priority || 'medium',
        is_enabled: is_enabled !== false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating news feed:', error)
      return NextResponse.json({ error: 'Failed to create feed' }, { status: 500 })
    }

    return NextResponse.json({ feed: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/news-feeds:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
