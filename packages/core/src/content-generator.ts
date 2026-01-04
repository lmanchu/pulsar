import OpenAI from 'openai'
import type { Persona, Platform } from './types.js'
import { buildSystemPrompt, buildPostPrompt, buildReplyPrompt } from './persona.js'

export interface GenerateOptions {
  persona: Persona
  platform: Platform
  type: 'post' | 'reply'
  targetContent?: string // For replies
}

export interface ContentGeneratorConfig {
  apiKey: string
  baseURL?: string
  defaultModel?: string
}

export class ContentGenerator {
  private client: OpenAI
  private defaultModel: string

  constructor(config: string | ContentGeneratorConfig) {
    // Support legacy string API key or new config object
    if (typeof config === 'string') {
      this.client = new OpenAI({ apiKey: config })
      this.defaultModel = 'gpt-4o-mini'
    } else {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.openai.com/v1'
      })
      this.defaultModel = config.defaultModel || 'gemini-2.5-flash'
    }
  }

  async generate(options: GenerateOptions, model?: string): Promise<string> {
    const { persona, platform, type, targetContent } = options

    const systemPrompt = buildSystemPrompt(persona, platform)
    const userPrompt =
      type === 'post'
        ? buildPostPrompt(persona.topics)
        : buildReplyPrompt(targetContent || '')

    const completion = await this.client.chat.completions.create({
      model: model || this.defaultModel,
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
