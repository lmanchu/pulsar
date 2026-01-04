#!/usr/bin/env node

/**
 * Test CLIProxyAPI Integration with Pulsar
 *
 * This script tests if Pulsar can successfully generate content
 * using CLIProxyAPI instead of direct OpenAI API.
 */

import { readFileSync } from 'fs'
import { ContentGenerator } from './packages/core/dist/index.js'

// Load .env.local manually
try {
  const envContent = readFileSync('.env.local', 'utf-8')
  envContent.split('\n').forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      if (key && value) {
        process.env[key.trim()] = value
      }
    }
  })
} catch (err) {
  console.error('⚠️  Warning: .env.local not found, using existing environment variables')
}

async function testCLIProxyIntegration() {
  console.log('🧪 Testing CLIProxyAPI Integration with Pulsar\n')

  // === Configuration ===
  const config = {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
    defaultModel: process.env.AI_MODEL || 'gemini-2.5-flash'
  }

  console.log('📋 Configuration:')
  console.log(`  API Key: ${config.apiKey?.slice(0, 20)}...`)
  console.log(`  Base URL: ${config.baseURL}`)
  console.log(`  Model: ${config.defaultModel}\n`)

  if (!config.apiKey || !config.baseURL) {
    console.error('❌ Missing environment variables!')
    console.error('   Please ensure .env.local contains:')
    console.error('   - OPENAI_API_KEY')
    console.error('   - OPENAI_BASE_URL')
    process.exit(1)
  }

  // === Initialize ContentGenerator ===
  console.log('🔧 Initializing ContentGenerator...')
  const generator = new ContentGenerator(config)

  // === Test Persona ===
  const testPersona = {
    id: 'test-1',
    userId: 'test-user',
    name: 'Tech Enthusiast',
    bio: 'Software engineer passionate about AI and automation',
    tone: 'Professional yet friendly, technical but accessible',
    topics: ['AI', 'Software Engineering', 'Automation', 'Productivity'],
    platform: 'twitter',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  console.log(`✅ ContentGenerator initialized\n`)

  // === Test Post Generation ===
  console.log('📝 Generating test post...')
  console.log(`   Persona: ${testPersona.name}`)
  console.log(`   Platform: ${testPersona.platform}`)
  console.log(`   Type: post\n`)

  try {
    const startTime = Date.now()

    const content = await generator.generate({
      persona: testPersona,
      platform: 'twitter',
      type: 'post'
    })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('✅ Post generated successfully!\n')
    console.log('📄 Generated Content:')
    console.log('━'.repeat(60))
    console.log(content)
    console.log('━'.repeat(60))
    console.log(`\n⏱️  Generation time: ${elapsed}s`)
    console.log(`📊 Character count: ${content.length}`)

    // === Verify via CLIProxyAPI logs ===
    console.log('\n🔍 Verification:')
    console.log('   Check CLIProxyAPI logs to confirm the request was routed:')
    console.log('   $ tail -20 ~/.logs/cliproxy.log')
    console.log(`   Look for: [${config.defaultModel}] request at ${new Date().toISOString().split('T')[0]}`)

    console.log('\n✅ CLIProxyAPI integration test PASSED!')

  } catch (error) {
    console.error('\n❌ Test FAILED!')
    console.error(`   Error: ${error.message}`)

    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n   🔧 Troubleshooting:')
      console.error('   1. Check if CLIProxyAPI is running:')
      console.error('      $ lsof -i :8317')
      console.error('   2. Check LaunchAgent status:')
      console.error('      $ launchctl list | grep cliproxy')
      console.error('   3. Check CLIProxyAPI logs:')
      console.error('      $ tail -50 ~/.logs/cliproxy.log')
    }

    process.exit(1)
  }
}

// Run test
testCLIProxyIntegration().catch(console.error)
