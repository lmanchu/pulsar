import { createServer } from 'http'
import { parse } from 'url'
import { config } from 'dotenv'
import next from 'next'
import { WebSocketServer } from 'ws'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
config({ path: '.env.local' })

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3100', 10)

// Initialize Next.js
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Initialize Supabase client (for server-side use)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Store connected extension clients: Map<token, { ws, userId }>
const connectedClients = new Map()

// Store pending post jobs: Map<jobId, { resolve, reject, timeout }>
const pendingJobs = new Map()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request:', err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  // Create WebSocket server
  const wss = new WebSocketServer({ noServer: true })

  // Handle WebSocket upgrade
  server.on('upgrade', async (request, socket, head) => {
    const parsedUrl = parse(request.url, true)

    // Only handle /api/extension/ws
    if (parsedUrl.pathname !== '/api/extension/ws') {
      socket.destroy()
      return
    }

    const token = parsedUrl.query.token

    if (!token) {
      console.log('[WS] No token provided')
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    // Validate token
    console.log('[WS] Validating token:', token.substring(0, 20) + '...')
    const { data: tokenRows, error } = await supabase
      .from('connection_tokens')
      .select('user_id, expires_at')
      .eq('token', token)

    if (error) {
      console.log('[WS] Token validation error:', error.message)
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    if (!tokenRows || tokenRows.length === 0) {
      console.log('[WS] Token not found in database')
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    const tokenData = tokenRows[0]
    console.log('[WS] Token found, user:', tokenData.user_id, 'expires:', tokenData.expires_at)

    // Auto-extend token on successful WebSocket connection (30 days)
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('connection_tokens')
      .update({ expires_at: newExpiresAt })
      .eq('token', token)
    console.log('[WS] Token extended to:', newExpiresAt)

    const userId = tokenData.user_id

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, userId, token)
    })
  })

  // Handle WebSocket connections
  wss.on('connection', (ws, request, userId, token) => {
    console.log(`[WS] Client connected for user: ${userId}`)

    // Store client
    connectedClients.set(token, { ws, userId })

    // Send connected confirmation
    ws.send(JSON.stringify({ type: 'connected', userId }))

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString())
        console.log(`[WS] Received from ${userId}:`, message.type)

        switch (message.type) {
          case 'pong':
            // Keep-alive response
            break

          case 'post_result':
            handlePostResult(message)
            break

          default:
            console.log(`[WS] Unknown message type: ${message.type}`)
        }
      } catch (err) {
        console.error('[WS] Error handling message:', err)
      }
    })

    ws.on('close', () => {
      console.log(`[WS] Client disconnected for user: ${userId}`)
      connectedClients.delete(token)
    })

    ws.on('error', (err) => {
      console.error(`[WS] Error for user ${userId}:`, err)
      connectedClients.delete(token)
    })

    // Start ping interval
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      } else {
        clearInterval(pingInterval)
      }
    }, 30000)

    ws.on('close', () => clearInterval(pingInterval))
  })

  // Handle post result from extension
  function handlePostResult(message) {
    const { jobId, success, postUrl, error } = message
    const pending = pendingJobs.get(jobId)

    if (pending) {
      clearTimeout(pending.timeout)
      pendingJobs.delete(jobId)

      if (success) {
        pending.resolve({ success: true, postUrl })
      } else {
        pending.reject(new Error(error || 'Post failed'))
      }
    }
  }

  // Export function to send post command to extension
  global.sendPostToExtension = async function (userId, jobData) {
    // Find connected client for this user
    let clientInfo = null
    for (const [token, info] of connectedClients) {
      if (info.userId === userId && info.ws.readyState === info.ws.OPEN) {
        clientInfo = info
        break
      }
    }

    if (!clientInfo) {
      throw new Error('Extension not connected. Please open the Pulsar extension and ensure it is connected.')
    }

    const { ws } = clientInfo
    const { jobId, platform, content, targetUrl, jobType } = jobData

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingJobs.delete(jobId)
        reject(new Error('Post timed out. Extension did not respond.'))
      }, 120000) // 2 minute timeout

      pendingJobs.set(jobId, { resolve, reject, timeout })

      const message = jobType === 'reply'
        ? { type: 'reply', jobId, platform, content, targetUrl }
        : { type: 'post', jobId, platform, content }

      ws.send(JSON.stringify(message))
      console.log(`[WS] Sent ${message.type} command to extension for job ${jobId}`)
    })
  }

  // Export function to check if user has connected extension
  global.isExtensionConnected = function (userId) {
    for (const [token, info] of connectedClients) {
      if (info.userId === userId && info.ws.readyState === info.ws.OPEN) {
        return true
      }
    }
    return false
  }

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/extension/ws`)
  })
})
