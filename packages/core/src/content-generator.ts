import Anthropic from '@anthropic-ai/sdk'
import type { Persona, Platform } from './types.js'
import { buildSystemPrompt, buildPostPrompt, buildReplyPrompt } from './persona.js'

export interface GenerateOptions {
  persona: Persona
  platform: Platform
  type: 'post' | 'reply'
  targetContent?: string // For replies
}

export class ContentGenerator {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async generate(options: GenerateOptions): Promise<string> {
    const { persona, platform, type, targetContent } = options

    const systemPrompt = buildSystemPrompt(persona, platform)
    const userPrompt =
      type === 'post'
        ? buildPostPrompt(persona.topics)
        : buildReplyPrompt(targetContent || '')

    const message = await this.client.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = message.content[0]
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    return (content as { type: 'text'; text: string }).text.trim()
  }
}
