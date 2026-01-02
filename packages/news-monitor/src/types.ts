/**
 * News Monitor Types
 */

export interface NewsFeed {
  id: string
  userId: string
  name: string
  url: string
  category: string
  priority: 'high' | 'medium' | 'low'
  isEnabled: boolean
  lastFetchedAt: Date | null
}

export interface RawArticle {
  url: string
  title: string
  source: string
  summary: string
  publishedAt: Date | null
  feedId: string
}

export interface ScoredArticle extends RawArticle {
  score: number
  isHighlight: boolean
  aiReason: string
  suggestedAngle: string
  draftContent: string
}

export interface NewsArticle extends ScoredArticle {
  id: string
  userId: string
  status: 'pending' | 'approved' | 'rejected' | 'published'
  platforms: string[]
  scheduledAt: Date | null
  personaId: string | null
  contentJobId: string | null
  publishedUrl: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface NewsKeyword {
  id: string
  userId: string
  keyword: string
  weight: 'high' | 'medium' | 'low'
}

export interface ScoringConfig {
  highlightThreshold: number
  minScoreForQueue: number
  keywords: {
    high: string[]
    medium: string[]
    low: string[]
  }
}

export interface UserContext {
  userId: string
  persona?: {
    name: string
    bio: string
    tone: string
    topics: string[]
  }
  keywords: NewsKeyword[]
}
