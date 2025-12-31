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
      .from('content_jobs')
      .select(`
        id,
        platform,
        job_type,
        target_url,
        target_content,
        generated_content,
        final_content,
        status,
        error_message,
        scheduled_at,
        posted_at,
        post_url,
        created_at,
        updated_at,
        persona:personas(id, name),
        social_account:social_accounts(id, username, platform)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching content jobs:', error)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    return NextResponse.json({ jobs: data })
  } catch (error) {
    console.error('Error in GET /api/content-jobs:', error)
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
    const {
      persona_id,
      social_account_id,
      platform,
      job_type,
      target_url,
      target_content,
      scheduled_at,
      generate_content = true
    } = body

    if (!persona_id || !platform || !job_type) {
      return NextResponse.json(
        { error: 'Missing required fields: persona_id, platform, job_type' },
        { status: 400 }
      )
    }

    if (!['twitter', 'linkedin'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be twitter or linkedin' },
        { status: 400 }
      )
    }

    if (!['post', 'reply'].includes(job_type)) {
      return NextResponse.json(
        { error: 'Invalid job_type. Must be post or reply' },
        { status: 400 }
      )
    }

    if (job_type === 'reply' && !target_url) {
      return NextResponse.json(
        { error: 'target_url is required for reply jobs' },
        { status: 400 }
      )
    }

    // Verify persona belongs to user
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('id, name, bio, tone, topics, example_posts')
      .eq('id', persona_id)
      .eq('user_id', user.id)
      .single()

    if (personaError || !persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      )
    }

    // Create the job
    const { data, error } = await supabase
      .from('content_jobs')
      .insert({
        user_id: user.id,
        persona_id,
        social_account_id: social_account_id || null,
        platform,
        job_type,
        target_url: target_url || null,
        target_content: target_content || null,
        scheduled_at: scheduled_at || null,
        status: generate_content ? 'generating' : 'pending',
      })
      .select(`
        id,
        platform,
        job_type,
        target_url,
        status,
        scheduled_at,
        created_at,
        persona:personas(id, name)
      `)
      .single()

    if (error) {
      console.error('Error creating content job:', error)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    // If generate_content is true, trigger AI generation
    if (generate_content) {
      // Async generation - don't wait
      generateContent(supabase, data.id, persona, platform, job_type, target_content)
    }

    return NextResponse.json({ job: data }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/content-jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// AI Content Generation (async, non-blocking)
async function generateContent(
  supabase: any,
  jobId: string,
  persona: { name: string; bio: string; tone: string; topics: string[]; example_posts: string[] },
  platform: string,
  jobType: string,
  targetContent?: string
) {
  try {
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const systemPrompt = `You are a social media content creator with the following persona:
Name: ${persona.name}
Bio: ${persona.bio}
Tone: ${persona.tone}
Topics: ${persona.topics.join(', ')}

${persona.example_posts?.length ? `Example posts for reference:\n${persona.example_posts.join('\n')}\n` : ''}

Generate content that matches this persona's voice and style.`

    let userPrompt = ''
    if (jobType === 'post') {
      const charLimit = platform === 'twitter' ? 280 : 3000
      userPrompt = `Create a ${platform} post (max ${charLimit} characters) about one of your expertise topics. Be authentic and engaging.`
    } else {
      userPrompt = `Write a thoughtful reply to this post:\n"${targetContent}"\n\nKeep it concise, authentic, and add value to the conversation.`
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const result = await response.json()
    const generatedContent = result.choices[0]?.message?.content?.trim()

    if (!generatedContent) {
      throw new Error('No content generated')
    }

    // Update job with generated content
    await supabase
      .from('content_jobs')
      .update({
        generated_content: generatedContent,
        final_content: generatedContent,
        status: 'ready',
      })
      .eq('id', jobId)

  } catch (error) {
    console.error('Error generating content:', error)

    // Update job with error
    await supabase
      .from('content_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Content generation failed',
      })
      .eq('id', jobId)
  }
}
