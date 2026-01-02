/**
 * Pulsar Worker - Polling-based job processor
 *
 * Features:
 * - Polls Supabase for pending jobs
 * - Decrypts user credentials
 * - Uses Puppeteer for browser automation
 * - No Redis required
 */

import 'dotenv/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ContentGenerator } from '@pulsar/core'
import { getBrowserPool, TwitterAutomation, LinkedInAutomation, ThreadsAutomation } from '@pulsar/browser'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// ============================================
// Configuration
// ============================================

const config = {
  // Polling interval in milliseconds
  pollInterval: 60 * 1000, // 1 minute

  // Maximum jobs to process per poll
  maxJobsPerPoll: 5,

  // Delay between jobs to avoid rate limits
  delayBetweenJobs: 5000, // 5 seconds
}

// ============================================
// Supabase Client
// ============================================

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key)
}

// ============================================
// Credential Encryption/Decryption
// ============================================

interface EncryptedData {
  iv: string
  encrypted: string
  authTag: string
}

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  return Buffer.from(key, 'hex')
}

function decrypt(encryptedData: EncryptedData): Record<string, unknown> {
  const key = getEncryptionKey()
  const iv = Buffer.from(encryptedData.iv, 'hex')
  const authTag = Buffer.from(encryptedData.authTag, 'hex')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return JSON.parse(decrypted)
}

// ============================================
// Database Queries
// ============================================

interface ContentJob {
  id: string
  user_id: string
  persona_id: string
  social_account_id: string | null
  platform: 'twitter' | 'linkedin' | 'threads'
  job_type: 'post' | 'reply'
  target_url: string | null
  target_content: string | null
  generated_content: string | null
  status: string
  scheduled_at: string | null
}

interface SocialAccount {
  id: string
  platform: string
  username: string
  encrypted_credentials: EncryptedData | null
  encrypted_cookies: EncryptedData | null
  auth_method: 'credentials' | 'session'
}

interface Persona {
  id: string
  user_id: string
  name: string
  bio: string
  tone: string
  topics: string[]
  platform: string
}

async function getPendingJobs(supabase: SupabaseClient, limit: number): Promise<ContentJob[]> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('content_jobs')
    .select('*')
    .eq('status', 'pending')
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching pending jobs:', error)
    return []
  }

  return data || []
}

async function getSocialAccount(supabase: SupabaseClient, userId: string, platform: string): Promise<SocialAccount | null> {
  const { data, error } = await supabase
    .from('social_accounts')
    .select('id, platform, username, encrypted_credentials, encrypted_cookies, auth_method')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Error fetching social account:', error)
    return null
  }

  return data
}

async function getPersona(supabase: SupabaseClient, personaId: string): Promise<Persona | null> {
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('id', personaId)
    .single()

  if (error) {
    console.error('Error fetching persona:', error)
    return null
  }

  return data
}

async function updateJobStatus(
  supabase: SupabaseClient,
  jobId: string,
  status: string,
  content?: string,
  errorMessage?: string,
  postUrl?: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (content) updates.final_content = content
  if (errorMessage) updates.error_message = errorMessage
  if (postUrl) updates.post_url = postUrl
  if (status === 'completed') updates.posted_at = new Date().toISOString()

  const { error } = await supabase
    .from('content_jobs')
    .update(updates)
    .eq('id', jobId)

  if (error) {
    console.error('Error updating job status:', error)
  }
}

async function incrementDailyStat(
  supabase: SupabaseClient,
  userId: string,
  platform: string,
  type: 'posts' | 'replies'
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase.rpc('increment_daily_stat', {
    p_user_id: userId,
    p_date: today,
    p_platform: platform,
    p_type: type,
  })

  if (error) {
    console.error('Error incrementing daily stat:', error)
  }
}

// ============================================
// Job Processor
// ============================================

async function processJob(
  supabase: SupabaseClient,
  job: ContentJob,
  generator: ContentGenerator | null
): Promise<void> {
  console.log(`\n[${new Date().toISOString()}] Processing job ${job.id}`)
  console.log(`  Platform: ${job.platform}, Type: ${job.job_type}`)

  try {
    // Update status to processing
    await updateJobStatus(supabase, job.id, 'generating')

    // Get social account with credentials or cookies
    const socialAccount = await getSocialAccount(supabase, job.user_id, job.platform)
    if (!socialAccount) {
      throw new Error(`No active ${job.platform} account found for user`)
    }

    const useSession = socialAccount.auth_method === 'session'

    // Validate auth data
    if (useSession) {
      if (!socialAccount.encrypted_cookies) {
        throw new Error('No session cookies stored for this account')
      }
    } else {
      if (!socialAccount.encrypted_credentials) {
        throw new Error('No credentials stored for this account')
      }
    }

    // Decrypt auth data
    const authData = useSession
      ? decrypt(socialAccount.encrypted_cookies!)
      : decrypt(socialAccount.encrypted_credentials!)
    console.log(`  Using account: ${socialAccount.username} (${useSession ? 'session' : 'credentials'})`)

    // Get persona for content generation
    const persona = await getPersona(supabase, job.persona_id)
    if (!persona) {
      throw new Error(`Persona not found: ${job.persona_id}`)
    }

    // Generate content if not already generated
    let content = job.generated_content
    if (!content) {
      if (!generator) {
        throw new Error('Content generation required but ANTHROPIC_API_KEY not configured')
      }
      console.log('  Generating content...')
      content = await generator.generate({
        persona: {
          id: persona.id,
          userId: persona.user_id,
          name: persona.name,
          bio: persona.bio,
          tone: persona.tone,
          topics: persona.topics,
          platform: job.platform,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        platform: job.platform,
        type: job.job_type,
        targetContent: job.target_content || undefined,
      })
      console.log(`  Generated: ${content.substring(0, 50)}...`)
    }

    // Update status to posting
    await updateJobStatus(supabase, job.id, 'posting', content)

    // Get browser from pool
    const pool = getBrowserPool()
    const { page, release } = await pool.acquire()

    try {
      let postUrl = ''

      if (job.platform === 'twitter') {
        const twitter = new TwitterAutomation(page)

        if (useSession) {
          // Use session cookies
          const cookies = (authData as { cookies: Array<{ name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' }> }).cookies
          await twitter.loginWithCookies(cookies)
        } else {
          // Use credentials
          await twitter.login({
            username: authData.username as string,
            password: authData.password as string,
            email: authData.email as string | undefined,
          })
        }

        if (job.job_type === 'post') {
          postUrl = await twitter.post(content)
        } else if (job.job_type === 'reply' && job.target_url) {
          postUrl = await twitter.reply(job.target_url, content)
        }
      } else if (job.platform === 'linkedin') {
        const linkedin = new LinkedInAutomation(page)

        if (useSession) {
          // Use session cookies
          const cookies = (authData as { cookies: Array<{ name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' }> }).cookies
          await linkedin.loginWithCookies(cookies)
        } else {
          // Use credentials
          await linkedin.login({
            email: authData.email as string,
            password: authData.password as string,
          })
        }

        if (job.job_type === 'post') {
          postUrl = await linkedin.post(content)
        } else if (job.job_type === 'reply' && job.target_url) {
          postUrl = await linkedin.comment(job.target_url, content)
        }
      } else if (job.platform === 'threads') {
        const threads = new ThreadsAutomation(page)

        if (useSession) {
          // Use session cookies
          const cookies = (authData as { cookies: Array<{ name: string; value: string; domain?: string; path?: string; expires?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None' }> }).cookies
          await threads.loginWithCookies(cookies)
        } else {
          // Use credentials (Instagram login)
          await threads.login({
            username: authData.username as string,
            password: authData.password as string,
          })
        }

        if (job.job_type === 'post') {
          postUrl = await threads.post(content)
        } else if (job.job_type === 'reply' && job.target_url) {
          postUrl = await threads.reply(job.target_url, content)
        }
      }

      // Update status to completed
      await updateJobStatus(supabase, job.id, 'completed', content, undefined, postUrl)

      // Increment daily stats
      await incrementDailyStat(
        supabase,
        job.user_id,
        job.platform,
        job.job_type === 'post' ? 'posts' : 'replies'
      )

      console.log(`  ✅ Job completed successfully`)
    } finally {
      release()
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`  ❌ Job failed: ${errorMessage}`)
    await updateJobStatus(supabase, job.id, 'failed', undefined, errorMessage)
  }
}

// ============================================
// Main Worker Loop
// ============================================

async function runWorker(): Promise<void> {
  console.log('========================================')
  console.log('🚀 Pulsar Worker Started')
  console.log('========================================')
  console.log(`Poll interval: ${config.pollInterval / 1000}s`)
  console.log(`Max jobs per poll: ${config.maxJobsPerPoll}`)
  console.log('')

  // Initialize Supabase client
  const supabase = getSupabaseAdmin()

  // Initialize content generator (optional - only needed for content generation)
  const openaiKey = process.env.OPENAI_API_KEY
  let generator: ContentGenerator | null = null
  if (openaiKey) {
    generator = new ContentGenerator(openaiKey)
    console.log('✅ Content generator initialized (OpenAI)')
  } else {
    console.log('⚠️  OPENAI_API_KEY not set - content generation disabled')
  }

  // Main loop
  while (true) {
    try {
      console.log(`\n[${new Date().toISOString()}] Polling for pending jobs...`)

      const jobs = await getPendingJobs(supabase, config.maxJobsPerPoll)

      if (jobs.length === 0) {
        console.log('  No pending jobs found')
      } else {
        console.log(`  Found ${jobs.length} pending job(s)`)

        for (const job of jobs) {
          await processJob(supabase, job, generator)

          // Delay between jobs to avoid rate limits
          if (jobs.indexOf(job) < jobs.length - 1) {
            await delay(config.delayBetweenJobs)
          }
        }
      }
    } catch (error) {
      console.error('Error in worker loop:', error)
    }

    // Wait before next poll
    await delay(config.pollInterval)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down worker...')
  await getBrowserPool().closeAll()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...')
  await getBrowserPool().closeAll()
  process.exit(0)
})

// ============================================
// Start Worker
// ============================================

runWorker().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
