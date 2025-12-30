import OpenAI from 'openai'
import type { Persona, Platform } from './types.js'
import { buildSystemPrompt, buildPostPrompt, buildReplyPrompt } from './persona.js'

export interface GenerateOptions {
  persona: Persona
  platform: Platform
  type: 'post' | 'reply'
  targetContent?: string // For replies
}

export class ContentGenerator {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async generate(options: GenerateOptions): Promise<string> {
    const { persona, platform, type, targetContent } = options

    const systemPrompt = buildSystemPrompt(persona, platform)
    const userPrompt =
      type === 'post'
        ? buildPostPrompt(persona.topics)
        : buildReplyPrompt(targetContent || '')

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content in response')
    }

    return content.trim()
  }
}
