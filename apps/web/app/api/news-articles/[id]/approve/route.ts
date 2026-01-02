import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { persona_id, social_account_id, platform, scheduled_at, final_content } = body

    if (!persona_id || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: persona_id, platform' },
        { status: 400 }
      )
    }

    // Get the article
    const { data: article, error: articleError } = await supabase
      .from('news_articles')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Verify persona belongs to user
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('id, name')
      .eq('id', persona_id)
      .eq('user_id', user.id)
      .single()

    if (personaError || !persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
    }

    // Use the database function to approve article and create content job
    const { data, error } = await supabase.rpc('approve_news_article', {
      p_article_id: id,
      p_persona_id: persona_id,
      p_platforms: [platform], // Convert single platform to array
      p_scheduled_at: scheduled_at || null,
      p_final_content: final_content || article.draft_content,
    })

    if (error) {
      console.error('Error approving article:', error)
      return NextResponse.json({ error: 'Failed to approve article' }, { status: 500 })
    }

    // Fetch the created content job
    const { data: contentJob, error: jobError } = await supabase
      .from('content_jobs')
      .select('*')
      .eq('id', data)
      .single()

    if (jobError) {
      console.error('Error fetching content job:', jobError)
    }

    return NextResponse.json({
      success: true,
      content_job_id: data,
      content_job: contentJob,
    })
  } catch (error) {
    console.error('Error in POST /api/news-articles/[id]/approve:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
