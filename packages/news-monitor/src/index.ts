/**
 * News Monitor - Main entry point
 * Fetches RSS feeds, scores with AI, and stores in Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { fetchAllFeeds } from './rss-fetcher.js'
import { AIScorer } from './ai-scorer.js'
import type { NewsFeed, ScoredArticle, UserContext, NewsKeyword } from './types.js'

export * from './types.js'
export { fetchFeed, fetchAllFeeds } from './rss-fetcher.js'
export { AIScorer } from './ai-scorer.js'

export interface MonitorConfig {
  supabaseUrl: string
  supabaseKey: string
  geminiApiKey: string
  userId: string
}

export class NewsMonitor {
  private supabase: SupabaseClient
  private scorer: AIScorer
  private userId: string

  constructor(config: MonitorConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey)
    this.scorer = new AIScorer(config.geminiApiKey)
    this.userId = config.userId
  }

  /**
   * Fetch all enabled feeds for the user
   */
  async getFeeds(): Promise<NewsFeed[]> {
    const { data, error } = await this.supabase
      .from('news_feeds')
      .select('*')
      .eq('user_id', this.userId)
      .eq('is_enabled', true)

    if (error) {
      console.error('Error fetching feeds:', error)
      throw error
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      url: row.url,
      category: row.category,
      priority: row.priority,
      isEnabled: row.is_enabled,
      lastFetchedAt: row.last_fetched_at ? new Date(row.last_fetched_at) : null,
    }))
  }

  /**
   * Get user keywords for scoring context
   */
  async getKeywords(): Promise<NewsKeyword[]> {
    const { data, error } = await this.supabase
      .from('news_keywords')
      .select('*')
      .eq('user_id', this.userId)

    if (error) {
      console.error('Error fetching keywords:', error)
      return []
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      keyword: row.keyword,
      weight: row.weight,
    }))
  }

  /**
   * Get user's active persona for content generation
   */
  async getActivePersona(): Promise<UserContext['persona'] | undefined> {
    const { data, error } = await this.supabase
      .from('personas')
      .select('*')
      .eq('user_id', this.userId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return undefined
    }

    return {
      name: data.name,
      bio: data.bio || '',
      tone: data.tone || 'professional',
      topics: data.topics || [],
    }
  }

  /**
   * Check if article already exists
   */
  async articleExists(url: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('news_articles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .eq('url', url)

    if (error) {
      console.error('Error checking article existence:', error)
      return false
    }

    return (count || 0) > 0
  }

  /**
   * Save scored articles to database
   */
  async saveArticles(articles: ScoredArticle[], minScore: number = 5): Promise<number> {
    let savedCount = 0

    for (const article of articles) {
      // Skip low-scoring articles
      if (article.score < minScore) continue

      // Check if already exists
      if (await this.articleExists(article.url)) {
        console.log(`  Skipping duplicate: ${article.title.substring(0, 50)}...`)
        continue
      }

      const { error } = await this.supabase.from('news_articles').insert({
        user_id: this.userId,
        feed_id: article.feedId,
        url: article.url,
        title: article.title,
        source: article.source,
        summary: article.summary,
        published_at: article.publishedAt?.toISOString() || null,
        score: article.score,
        is_highlight: article.isHighlight,
        ai_reason: article.aiReason,
        suggested_angle: article.suggestedAngle,
        draft_content: article.draftContent,
        status: 'pending',
      })

      if (error) {
        console.error(`Error saving article: ${article.title}`, error)
      } else {
        savedCount++
        console.log(`  Saved: [${article.score}] ${article.title.substring(0, 50)}...`)
      }
    }

    return savedCount
  }

  /**
   * Update feed's last fetched timestamp
   */
  async updateFeedTimestamp(feedId: string): Promise<void> {
    await this.supabase
      .from('news_feeds')
      .update({ last_fetched_at: new Date().toISOString() })
      .eq('id', feedId)
  }

  /**
   * Run the complete monitoring cycle
   */
  async run(options: { minScore?: number; batchSize?: number } = {}): Promise<{
    feedsProcessed: number
    articlesFound: number
    articlesSaved: number
  }> {
    const { minScore = 5, batchSize = 5 } = options

    console.log('=== News Monitor Starting ===')
    console.log(`User: ${this.userId}`)

    // Get feeds
    const feeds = await this.getFeeds()
    console.log(`Found ${feeds.length} enabled feeds`)

    if (feeds.length === 0) {
      return { feedsProcessed: 0, articlesFound: 0, articlesSaved: 0 }
    }

    // Fetch articles from all feeds
    const rawArticles = await fetchAllFeeds(feeds)
    console.log(`Fetched ${rawArticles.length} raw articles`)

    // Get user context for scoring
    const [keywords, persona] = await Promise.all([
      this.getKeywords(),
      this.getActivePersona(),
    ])

    const context: UserContext = {
      userId: this.userId,
      persona,
      keywords,
    }

    console.log(`Keywords: ${keywords.length}, Persona: ${persona?.name || 'none'}`)

    // Score articles with AI
    console.log('\nScoring articles with AI...')
    const scoredArticles = await this.scorer.scoreArticles(rawArticles, context, {
      batchSize,
      delayMs: 1000,
    })

    // Save to database
    console.log('\nSaving articles...')
    const savedCount = await this.saveArticles(scoredArticles, minScore)

    // Update feed timestamps
    const uniqueFeedIds = [...new Set(rawArticles.map((a) => a.feedId))]
    for (const feedId of uniqueFeedIds) {
      await this.updateFeedTimestamp(feedId)
    }

    console.log('\n=== News Monitor Complete ===')
    console.log(`Feeds: ${feeds.length}, Articles: ${rawArticles.length}, Saved: ${savedCount}`)

    return {
      feedsProcessed: feeds.length,
      articlesFound: rawArticles.length,
      articlesSaved: savedCount,
    }
  }
}

// CLI runner
async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
  const geminiApiKey = process.env.GEMINI_API_KEY
  const userId = process.env.USER_ID

  if (!supabaseUrl || !supabaseKey || !geminiApiKey || !userId) {
    console.error('Missing required environment variables:')
    console.error('  SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY, USER_ID')
    process.exit(1)
  }

  const monitor = new NewsMonitor({
    supabaseUrl,
    supabaseKey,
    geminiApiKey,
    userId,
  })

  try {
    const result = await monitor.run()
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Monitor failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
