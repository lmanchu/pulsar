import express from 'express'
import { browserManager, Platform } from './browser-manager'
import { postToTwitter, replyToTwitter } from './posters/twitter'
import { postToLinkedIn, replyToLinkedIn } from './posters/linkedin'
import { postToThreads, replyToThreads } from './posters/threads'

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3100

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pulsar-playwright' })
})

// Check login status
app.get('/status/:platform', async (req, res) => {
  const platform = req.params.platform as Platform
  if (!['twitter', 'linkedin', 'threads'].includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform' })
  }

  try {
    const isLoggedIn = await browserManager.isLoggedIn(platform)
    res.json({ platform, loggedIn: isLoggedIn })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

// Open login page for a platform
app.post('/login/:platform', async (req, res) => {
  const platform = req.params.platform as Platform
  if (!['twitter', 'linkedin', 'threads'].includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform' })
  }

  try {
    const result = await browserManager.openLoginPage(platform)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

// Post content
app.post('/post', async (req, res) => {
  const { platform, content, targetUrl, jobType = 'post' } = req.body

  if (!platform || !content) {
    return res.status(400).json({ error: 'platform and content are required' })
  }

  if (!['twitter', 'linkedin', 'threads'].includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform' })
  }

  try {
    let result

    if (jobType === 'reply') {
      if (!targetUrl) {
        return res.status(400).json({ error: 'targetUrl is required for replies' })
      }

      switch (platform) {
        case 'twitter':
          result = await replyToTwitter(targetUrl, content)
          break
        case 'linkedin':
          result = await replyToLinkedIn(targetUrl, content)
          break
        case 'threads':
          result = await replyToThreads(targetUrl, content)
          break
      }
    } else {
      switch (platform) {
        case 'twitter':
          result = await postToTwitter(content)
          break
        case 'linkedin':
          result = await postToLinkedIn(content)
          break
        case 'threads':
          result = await postToThreads(content)
          break
      }
    }

    if (result?.success) {
      res.json({ success: true, postUrl: result.postUrl })
    } else {
      res.status(500).json({ success: false, error: result?.error || 'Posting failed' })
    }
  } catch (error) {
    console.error('Post error:', error)
    res.status(500).json({ success: false, error: String(error) })
  }
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...')
  await browserManager.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Shutting down...')
  await browserManager.close()
  process.exit(0)
})

// Start server
async function main() {
  try {
    await browserManager.initialize()

    app.listen(PORT, () => {
      console.log(`Pulsar Playwright Service running on port ${PORT}`)
      console.log('Endpoints:')
      console.log('  GET  /health          - Health check')
      console.log('  GET  /status/:platform - Check login status')
      console.log('  POST /login/:platform  - Open login page')
      console.log('  POST /post            - Post content')
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

main()
