import { Worker, Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { ContentGenerator } from '@pulsar/core'
import {
  updateContentJobStatus,
  getPersonaById,
  incrementDailyStat,
} from '@pulsar/db'
import {
  getBrowserPool,
  TwitterAutomation,
  LinkedInAutomation,
} from '@pulsar/browser'

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const redis = new Redis(redisUrl)

// Queues
export const postQueue = new Queue('posts', { connection: redis })
export const replyQueue = new Queue('replies', { connection: redis })

// Content generator
const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is required')
}
const generator = new ContentGenerator(apiKey)

// Post worker
const postWorker = new Worker(
  'posts',
  async (job) => {
    const { jobId, userId, platform, personaId, type } = job.data
    console.log(`Processing ${type} job ${jobId} for ${platform}`)

    try {
      // Update status to processing
      await updateContentJobStatus(jobId, 'processing')

      // Get persona
      const persona = await getPersonaById(personaId)
      if (!persona) {
        throw new Error(`Persona not found: ${personaId}`)
      }

      // Generate content
      const content = await generator.generate({
        persona: {
          id: persona.id,
          userId: persona.user_id,
          name: persona.name,
          bio: persona.bio,
          tone: persona.tone,
          topics: persona.topics,
          platform: platform,
          createdAt: new Date(persona.created_at),
          updatedAt: new Date(persona.updated_at),
        },
        platform,
        type: 'post',
      })

      console.log(`Generated content: ${content.substring(0, 100)}...`)

      // Post to platform
      const pool = getBrowserPool()
      const { page, release } = await pool.acquire()

      try {
        if (platform === 'twitter') {
          const twitter = new TwitterAutomation(page)
          // Note: In production, credentials would come from user's connected account
          await twitter.login({
            username: process.env.TWITTER_USERNAME!,
            password: process.env.TWITTER_PASSWORD!,
          })
          await twitter.post(content)
        } else if (platform === 'linkedin') {
          const linkedin = new LinkedInAutomation(page)
          await linkedin.login({
            email: process.env.LINKEDIN_EMAIL!,
            password: process.env.LINKEDIN_PASSWORD!,
          })
          await linkedin.post(content)
        }

        // Update status to completed
        await updateContentJobStatus(jobId, 'completed', content)

        // Increment daily stats
        const today = new Date().toISOString().split('T')[0] as string
        await incrementDailyStat(userId, today, platform, 'posts')

        console.log(`Successfully posted to ${platform}`)
      } finally {
        release()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Job ${jobId} failed:`, errorMessage)
      await updateContentJobStatus(jobId, 'failed', undefined, errorMessage)
      throw error
    }
  },
  {
    connection: redis,
    concurrency: 2,
  }
)

// Reply worker
const replyWorker = new Worker(
  'replies',
  async (job) => {
    const { jobId, userId, platform, personaId, targetUrl } = job.data
    console.log(`Processing reply job ${jobId} for ${platform}`)

    try {
      await updateContentJobStatus(jobId, 'processing')

      const persona = await getPersonaById(personaId)
      if (!persona) {
        throw new Error(`Persona not found: ${personaId}`)
      }

      // Get target content
      const pool = getBrowserPool()
      const { page, release } = await pool.acquire()

      try {
        let targetContent = ''

        if (platform === 'twitter') {
          const twitter = new TwitterAutomation(page)
          await twitter.login({
            username: process.env.TWITTER_USERNAME!,
            password: process.env.TWITTER_PASSWORD!,
          })
          // Navigate to get tweet content
          await page.goto(targetUrl, { waitUntil: 'networkidle0' })
          targetContent =
            (await page.$eval(
              '[data-testid="tweetText"]',
              (el) => el.textContent
            )) || ''
        }

        // Generate reply
        const content = await generator.generate({
          persona: {
            id: persona.id,
            userId: persona.user_id,
            name: persona.name,
            bio: persona.bio,
            tone: persona.tone,
            topics: persona.topics,
            platform: platform,
            createdAt: new Date(persona.created_at),
            updatedAt: new Date(persona.updated_at),
          },
          platform,
          type: 'reply',
          targetContent,
        })

        // Post reply
        if (platform === 'twitter') {
          const twitter = new TwitterAutomation(page)
          await twitter.reply(targetUrl, content)
        } else if (platform === 'linkedin') {
          const linkedin = new LinkedInAutomation(page)
          await linkedin.login({
            email: process.env.LINKEDIN_EMAIL!,
            password: process.env.LINKEDIN_PASSWORD!,
          })
          await linkedin.comment(targetUrl, content)
        }

        await updateContentJobStatus(jobId, 'completed', content)

        const today = new Date().toISOString().split('T')[0] as string
        await incrementDailyStat(userId, today, platform, 'replies')

        console.log(`Successfully replied on ${platform}`)
      } finally {
        release()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Reply job ${jobId} failed:`, errorMessage)
      await updateContentJobStatus(jobId, 'failed', undefined, errorMessage)
      throw error
    }
  },
  {
    connection: redis,
    concurrency: 2,
  }
)

// Event handlers
postWorker.on('completed', (job) => {
  console.log(`Post job ${job.id} completed`)
})

postWorker.on('failed', (job, err) => {
  console.error(`Post job ${job?.id} failed:`, err.message)
})

replyWorker.on('completed', (job) => {
  console.log(`Reply job ${job.id} completed`)
})

replyWorker.on('failed', (job, err) => {
  console.error(`Reply job ${job?.id} failed:`, err.message)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...')
  await postWorker.close()
  await replyWorker.close()
  await getBrowserPool().closeAll()
  process.exit(0)
})

console.log('Pulsar workers started')
