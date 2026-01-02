import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

// Declare global functions from server.mjs
declare global {
  var sendPostToExtension: (
    userId: string,
    jobData: {
      jobId: string
      platform: string
      content: string
      targetUrl?: string
      jobType: string
    }
  ) => Promise<{ success: boolean; postUrl?: string }>
  var isExtensionConnected: (userId: string) => boolean
}

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

    // Check if extension is connected
    if (!global.isExtensionConnected || !global.isExtensionConnected(user.id)) {
      return NextResponse.json(
        { error: 'Extension not connected. Please open the Pulsar extension in your browser and ensure it shows "Connected".' },
        { status: 400 }
      )
    }

    // Get the job
    const { data: job, error: jobError } = await supabase
      .from('content_jobs')
      .select(`
        id,
        platform,
        job_type,
        target_url,
        final_content,
        generated_content,
        status,
        social_account_id
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'ready' && job.status !== 'failed') {
      return NextResponse.json({ error: 'Job is not ready to post' }, { status: 400 })
    }

    const content = job.final_content || job.generated_content
    if (!content) {
      return NextResponse.json({ error: 'No content to post' }, { status: 400 })
    }

    if (!job.social_account_id) {
      return NextResponse.json({ error: 'No social account linked to this job' }, { status: 400 })
    }

    // Get the social account
    const { data: socialAccount, error: accountError } = await supabase
      .from('social_accounts')
      .select('id, platform, username')
      .eq('id', job.social_account_id)
      .eq('user_id', user.id)
      .single()

    if (accountError || !socialAccount) {
      return NextResponse.json({ error: 'Social account not found' }, { status: 404 })
    }

    // Update status to posting
    await supabase
      .from('content_jobs')
      .update({ status: 'posting' })
      .eq('id', id)

    try {
      // Send post command to extension via WebSocket
      const result = await global.sendPostToExtension(user.id, {
        jobId: id,
        platform: job.platform,
        content,
        targetUrl: job.target_url || undefined,
        jobType: job.job_type,
      })

      // Update job as completed
      await supabase
        .from('content_jobs')
        .update({
          status: 'completed',
          posted_at: new Date().toISOString(),
          post_url: result.postUrl || null,
        })
        .eq('id', id)

      return NextResponse.json({
        success: true,
        post_url: result.postUrl,
        message: 'Content posted successfully via extension'
      })

    } catch (postError) {
      console.error('Extension posting error:', postError)

      // Update job as failed
      await supabase
        .from('content_jobs')
        .update({
          status: 'failed',
          error_message: postError instanceof Error ? postError.message : 'Failed to post',
        })
        .eq('id', id)

      return NextResponse.json({
        error: postError instanceof Error ? postError.message : 'Failed to post content'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in POST /api/content-jobs/[id]/post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
