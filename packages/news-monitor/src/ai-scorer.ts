/**
 * AI Scorer - Uses Gemini to score and analyze articles
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { RawArticle, ScoredArticle, UserContext } from './types.js'

export class AIScorer {
  private genAI: GoogleGenerativeAI
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  }

  async scoreArticle(article: RawArticle, context: UserContext): Promise<ScoredArticle> {
    const prompt = this.buildPrompt(article, context)

    try {
      const result = await this.model.generateContent(prompt)
      const response = result.response.text()

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        ...article,
        score: Math.min(10, Math.max(0, parsed.score || 5)),
        isHighlight: (parsed.score || 5) >= 8,
        aiReason: parsed.reason || '',
        suggestedAngle: parsed.suggested_angle || '',
        draftContent: parsed.draft_tweet || '',
      }
    } catch (error) {
      console.error(`Error scoring article: ${article.title}`, error)

      // Return with default score
      return {
        ...article,
        score: 5,
        isHighlight: false,
        aiReason: 'Scoring failed',
        suggestedAngle: '',
        draftContent: '',
      }
    }
  }

  async scoreArticles(
    articles: RawArticle[],
    context: UserContext,
    options: { batchSize?: number; delayMs?: number } = {}
  ): Promise<ScoredArticle[]> {
    const { batchSize = 5, delayMs = 1000 } = options
    const scored: ScoredArticle[] = []

    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize)

      const results = await Promise.all(
        batch.map((article) => this.scoreArticle(article, context))
      )

      scored.push(...results)

      // Rate limiting
      if (i + batchSize < articles.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score)
  }

  private buildPrompt(article: RawArticle, context: UserContext): string {
    const keywordsList = context.keywords
      .map((k) => `${k.keyword} (${k.weight})`)
      .join(', ')

    const personaInfo = context.persona
      ? `
Persona: ${context.persona.name}
Bio: ${context.persona.bio}
Tone: ${context.persona.tone}
Topics: ${context.persona.topics.join(', ')}
`
      : ''

    return `You are a content curator AI. Analyze this article and provide a score and analysis.

${personaInfo}

Keywords of interest: ${keywordsList || 'AI, tech, startups, innovation'}

Article to analyze:
Title: ${article.title}
Source: ${article.source}
Summary: ${article.summary?.substring(0, 500) || 'No summary available'}

Scoring criteria (0-10):
- 9-10: Breaking news, highly relevant, must share
- 7-8: Very relevant, good commentary opportunity
- 5-6: Somewhat relevant, interesting but not urgent
- 3-4: Low relevance
- 0-2: Not relevant at all

Respond ONLY with a JSON object:
{
  "score": <number 0-10>,
  "reason": "<why this score, 1-2 sentences>",
  "suggested_angle": "<unique angle for commentary, 1 sentence>",
  "draft_tweet": "<ready-to-post tweet under 280 chars, engaging and insightful>"
}
`
  }
}
