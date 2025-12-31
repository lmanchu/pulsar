import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'
import { getBrowserPool, TwitterAutomation, LinkedInAutomation } from '@pulsar/browser'
import type { SessionCookie } from '@pulsar/browser'
import { decrypt, EncryptedData } from '../../../../../lib/crypto'

interface StoredCookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: string
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

    // Get the social account with encrypted cookies
    const { data: socialAccount, error: accountError } = await supabase
      .from('social_accounts')
      .select('id, platform, encrypted_cookies, username')
      .eq('id', job.social_account_id)
      .eq('user_id', user.id)
      .single()

    if (accountError || !socialAccount) {
      return NextResponse.json({ error: 'Social account not found' }, { status: 404 })
    }

    if (!socialAccount.encrypted_cookies) {
      return NextResponse.json({ error: 'No cookies found for social account. Please reconnect via extension.' }, { status: 400 })
    }

    // Decrypt cookies
    let storedCookies: StoredCookie[]
    try {
      const decrypted = decrypt(socialAccount.encrypted_cookies as EncryptedData)
      storedCookies = decrypted.cookies as StoredCookie[]
    } catch (decryptError) {
      console.error('Failed to decrypt cookies:', decryptError)
      return NextResponse.json({ error: 'Failed to decrypt cookies. Please reconnect via extension.' }, { status: 500 })
    }

    if (!storedCookies || storedCookies.length === 0) {
      return NextResponse.json({ error: 'No cookies found for social account. Please reconnect via extension.' }, { status: 400 })
    }

    // Update status to posting
    await supabase
      .from('content_jobs')
      .update({ status: 'posting' })
      .eq('id', id)

    // Acquire browser from pool
    const pool = getBrowserPool()
    const { page, release } = await pool.acquire()

    try {
      let postUrl: string | null = null

      // Convert stored cookies to SessionCookie format
      const cookies: SessionCookie[] = storedCookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
      }))

      if (job.platform === 'twitter') {
        const twitter = new TwitterAutomation(page)
        await twitter.loginWithCookies(cookies)

        if (job.job_type === 'reply' && job.target_url) {
          postUrl = await twitter.reply(job.target_url, content)
        } else {
          postUrl = await twitter.post(content)
        }
      } else if (job.platform === 'linkedin') {
        const linkedin = new LinkedInAutomation(page)
        await linkedin.loginWithCookies(cookies)

        if (job.job_type === 'reply' && job.target_url) {
          postUrl = await linkedin.comment(job.target_url, content)
        } else {
          postUrl = await linkedin.post(content)
        }
      } else {
        throw new Error(`Unsupported platform: ${job.platform}`)
      }

      // Update job as completed
      await supabase
        .from('content_jobs')
        .update({
          status: 'completed',
          posted_at: new Date().toISOString(),
          post_url: postUrl,
        })
        .eq('id', id)

      return NextResponse.json({
        success: true,
        post_url: postUrl,
        message: 'Content posted successfully'
      })

    } catch (postError) {
      console.error('Puppeteer posting error:', postError)

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
    } finally {
      // Always release the browser back to the pool
      release()
    }

  } catch (error) {
    console.error('Error in POST /api/content-jobs/[id]/post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
