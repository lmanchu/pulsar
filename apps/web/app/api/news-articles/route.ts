import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const minScore = searchParams.get('minScore')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('news_articles')
      .select(`
        *,
        feed:news_feeds(id, name, category),
        content_job:content_jobs(id, status, post_url)
      `)
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (minScore) {
      query = query.gte('score', parseInt(minScore, 10))
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching news articles:', error)
      return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
    }

    return NextResponse.json({ articles: data, count })
  } catch (error) {
    console.error('Error in GET /api/news-articles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
