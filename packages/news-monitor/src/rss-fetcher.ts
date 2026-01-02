/**
 * RSS Feed Fetcher
 */

import Parser from 'rss-parser'
import type { NewsFeed, RawArticle } from './types.js'

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'Pulsar News Monitor/1.0',
  },
})

export async function fetchFeed(feed: NewsFeed): Promise<RawArticle[]> {
  try {
    const parsed = await parser.parseURL(feed.url)
    const articles: RawArticle[] = []

    for (const item of parsed.items.slice(0, 30)) {
      if (!item.link || !item.title) continue

      articles.push({
        url: item.link,
        title: item.title,
        source: feed.name,
        summary: item.contentSnippet || item.content || '',
        publishedAt: item.pubDate ? new Date(item.pubDate) : null,
        feedId: feed.id,
      })
    }

    return articles
  } catch (error) {
    console.error(`Error fetching feed ${feed.name}:`, error)
    throw error
  }
}

export async function fetchAllFeeds(feeds: NewsFeed[]): Promise<RawArticle[]> {
  const allArticles: RawArticle[] = []
  const errors: Array<{ feed: string; error: string }> = []

  for (const feed of feeds) {
    if (!feed.isEnabled) continue

    try {
      console.log(`Fetching: ${feed.name}...`)
      const articles = await fetchFeed(feed)
      allArticles.push(...articles)
      console.log(`  Found ${articles.length} articles`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ feed: feed.name, error: errorMessage })
    }
  }

  if (errors.length > 0) {
    console.warn('Feed errors:', errors)
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  const unique = allArticles.filter((article) => {
    if (seen.has(article.url)) return false
    seen.add(article.url)
    return true
  })

  console.log(`Total unique articles: ${unique.length}`)
  return unique
}
