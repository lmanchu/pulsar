'use client'

import { useState, useEffect } from 'react'

interface NewsArticle {
  id: string
  url: string
  title: string
  source: string
  summary: string
  published_at: string | null
  score: number
  is_highlight: boolean
  ai_reason: string
  suggested_angle: string
  draft_content: string
  status: 'pending' | 'approved' | 'rejected' | 'published'
  created_at: string
  feed: { id: string; name: string; category: string } | null
  content_job: { id: string; status: string; post_url: string | null } | null
}

interface NewsFeed {
  id: string
  name: string
  url: string
  category: string
  priority: 'high' | 'medium' | 'low'
  is_enabled: boolean
  last_fetched_at: string | null
  created_at: string
}

interface Persona {
  id: string
  name: string
}

interface SocialAccount {
  id: string
  platform: string
  username: string
}

function ScoreBadge({ score }: { score: number }) {
  let colorClass = 'bg-gray-500/10 text-gray-400 ring-gray-500/20'
  if (score >= 8) colorClass = 'bg-green-500/10 text-green-400 ring-green-500/20'
  else if (score >= 6) colorClass = 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'
  else if (score >= 4) colorClass = 'bg-orange-500/10 text-orange-400 ring-orange-500/20'
  else colorClass = 'bg-red-500/10 text-red-400 ring-red-500/20'

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${colorClass}`}>
      {score}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
    approved: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    rejected: 'bg-red-500/10 text-red-400 ring-red-500/20',
    published: 'bg-green-500/10 text-green-400 ring-green-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[status] || styles.pending}`}>
      {status}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high: 'bg-red-500/10 text-red-400 ring-red-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
    low: 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[priority] || styles.medium}`}>
      {priority}
    </span>
  )
}

export default function NewsPage() {
  const [tab, setTab] = useState<'articles' | 'feeds'>('articles')
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [feeds, setFeeds] = useState<NewsFeed[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'published'>('pending')

  // Approve modal state
  const [approving, setApproving] = useState<NewsArticle | null>(null)
  const [approveForm, setApproveForm] = useState({
    persona_id: '',
    social_account_id: '',
    platform: 'twitter' as 'twitter' | 'linkedin',
    final_content: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Add feed modal state
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [newFeed, setNewFeed] = useState({
    name: '',
    url: '',
    category: 'general',
    priority: 'medium' as 'high' | 'medium' | 'low',
  })
  const [addingFeed, setAddingFeed] = useState(false)

  useEffect(() => {
    if (tab === 'articles') {
      fetchArticles()
      fetchPersonas()
      fetchSocialAccounts()
    } else {
      fetchFeeds()
    }
  }, [tab])

  async function fetchArticles() {
    setLoading(true)
    try {
      const res = await fetch('/api/news-articles')
      const data = await res.json()
      if (res.ok) {
        setArticles(data.articles || [])
      } else {
        setError(data.error || 'Failed to fetch articles')
      }
    } catch (err) {
      setError('Failed to fetch articles')
    } finally {
      setLoading(false)
    }
  }

  async function fetchFeeds() {
    setLoading(true)
    try {
      const res = await fetch('/api/news-feeds')
      const data = await res.json()
      if (res.ok) {
        setFeeds(data.feeds || [])
      } else {
        setError(data.error || 'Failed to fetch feeds')
      }
    } catch (err) {
      setError('Failed to fetch feeds')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPersonas() {
    try {
      const res = await fetch('/api/personas')
      const data = await res.json()
      if (res.ok) {
        setPersonas(data.personas || [])
      }
    } catch (err) {
      console.error('Failed to fetch personas:', err)
    }
  }

  async function fetchSocialAccounts() {
    try {
      const res = await fetch('/api/social-accounts')
      const data = await res.json()
      if (res.ok) {
        setSocialAccounts(data.accounts || [])
      }
    } catch (err) {
      console.error('Failed to fetch social accounts:', err)
    }
  }

  function openApproveModal(article: NewsArticle) {
    setApproving(article)
    setApproveForm({
      persona_id: '',
      social_account_id: '',
      platform: 'twitter',
      final_content: article.draft_content || '',
    })
  }

  async function submitApproval() {
    if (!approving) return
    if (!approveForm.persona_id) {
      alert('Please select a persona')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/news-articles/${approving.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approveForm),
      })
      const data = await res.json()
      if (res.ok) {
        setApproving(null)
        fetchArticles()
      } else {
        alert(data.error || 'Failed to approve article')
      }
    } catch (err) {
      alert('Failed to approve article')
    } finally {
      setSubmitting(false)
    }
  }

  async function rejectArticle(article: NewsArticle) {
    try {
      const res = await fetch(`/api/news-articles/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      })
      if (res.ok) {
        fetchArticles()
      }
    } catch (err) {
      console.error('Failed to reject article:', err)
    }
  }

  async function addFeed() {
    if (!newFeed.name || !newFeed.url) {
      alert('Name and URL are required')
      return
    }

    setAddingFeed(true)
    try {
      const res = await fetch('/api/news-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeed),
      })
      const data = await res.json()
      if (res.ok) {
        setShowAddFeed(false)
        setNewFeed({ name: '', url: '', category: 'general', priority: 'medium' })
        fetchFeeds()
      } else {
        alert(data.error || 'Failed to add feed')
      }
    } catch (err) {
      alert('Failed to add feed')
    } finally {
      setAddingFeed(false)
    }
  }

  async function toggleFeed(feed: NewsFeed) {
    try {
      const res = await fetch(`/api/news-feeds/${feed.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !feed.is_enabled }),
      })
      if (res.ok) {
        fetchFeeds()
      }
    } catch (err) {
      console.error('Failed to toggle feed:', err)
    }
  }

  async function deleteFeed(feed: NewsFeed) {
    if (!confirm(`Delete feed "${feed.name}"?`)) return

    try {
      const res = await fetch(`/api/news-feeds/${feed.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchFeeds()
      }
    } catch (err) {
      console.error('Failed to delete feed:', err)
    }
  }

  const filteredArticles = articles.filter((a) => {
    if (filter === 'all') return true
    return a.status === filter
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); tab === 'articles' ? fetchArticles() : fetchFeeds() }}
          className="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">News Pipeline</h1>
          <p className="mt-1 text-sm text-gray-400">
            AI-curated news for social media content
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-4">
        <button
          onClick={() => setTab('articles')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'articles'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Articles
        </button>
        <button
          onClick={() => setTab('feeds')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'feeds'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          RSS Feeds
        </button>
      </div>

      {/* Articles Tab */}
      {tab === 'articles' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Pending', count: articles.filter(a => a.status === 'pending').length, color: 'text-yellow-400' },
              { label: 'Approved', count: articles.filter(a => a.status === 'approved').length, color: 'text-blue-400' },
              { label: 'Published', count: articles.filter(a => a.status === 'published').length, color: 'text-green-400' },
              { label: 'Highlights', count: articles.filter(a => a.is_highlight).length, color: 'text-purple-400' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-gray-900 p-4 ring-1 ring-gray-800">
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className={`mt-1 text-2xl font-semibold ${stat.color}`}>{stat.count}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(['pending', 'approved', 'published', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Articles List */}
          {filteredArticles.length === 0 ? (
            <div className="rounded-xl bg-gray-900 p-12 text-center ring-1 ring-gray-800">
              <p className="text-gray-400">No articles found</p>
              <p className="mt-2 text-sm text-gray-500">Add RSS feeds to start monitoring news</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className={`rounded-xl bg-gray-900 p-5 ring-1 transition-colors ${
                    article.is_highlight ? 'ring-purple-500/50' : 'ring-gray-800 hover:ring-purple-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <ScoreBadge score={article.score} />
                        <StatusBadge status={article.status} />
                        {article.is_highlight && (
                          <span className="text-xs text-purple-400 font-medium">HIGHLIGHT</span>
                        )}
                        <span className="text-xs text-gray-500">{article.source}</span>
                        {article.feed && (
                          <span className="text-xs text-gray-600">({article.feed.category})</span>
                        )}
                      </div>

                      <h3 className="mt-2 text-white font-medium">
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400">
                          {article.title}
                        </a>
                      </h3>

                      {article.ai_reason && (
                        <p className="mt-2 text-sm text-gray-400">{article.ai_reason}</p>
                      )}

                      {article.suggested_angle && (
                        <p className="mt-1 text-sm text-purple-300/70 italic">"{article.suggested_angle}"</p>
                      )}

                      <div className="mt-3 text-xs text-gray-500">
                        {article.published_at && formatDate(article.published_at)} - Added {formatDate(article.created_at)}
                      </div>
                    </div>

                    {article.status === 'pending' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => openApproveModal(article)}
                          className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-500"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectArticle(article)}
                          className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-700"
                        >
                          Skip
                        </button>
                      </div>
                    )}

                    {article.status === 'published' && article.content_job?.post_url && (
                      <a
                        href={article.content_job.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-purple-400 hover:underline"
                      >
                        View Post
                      </a>
                    )}
                  </div>

                  {article.draft_content && article.status === 'pending' && (
                    <div className="mt-4 rounded-lg bg-gray-800 p-3">
                      <p className="text-xs text-gray-500 mb-1">Draft:</p>
                      <p className="text-sm text-gray-300">{article.draft_content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Feeds Tab */}
      {tab === 'feeds' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddFeed(true)}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Feed
            </button>
          </div>

          {feeds.length === 0 ? (
            <div className="rounded-xl bg-gray-900 p-12 text-center ring-1 ring-gray-800">
              <p className="text-gray-400">No RSS feeds configured</p>
              <p className="mt-2 text-sm text-gray-500">Add feeds to start monitoring news sources</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feeds.map((feed) => (
                <div
                  key={feed.id}
                  className={`rounded-xl bg-gray-900 p-5 ring-1 ring-gray-800 ${!feed.is_enabled && 'opacity-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleFeed(feed)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          feed.is_enabled ? 'bg-purple-600' : 'bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            feed.is_enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-white font-medium">{feed.name}</h3>
                          <PriorityBadge priority={feed.priority} />
                          <span className="text-xs text-gray-500">{feed.category}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-400 break-all">{feed.url}</p>
                        {feed.last_fetched_at && (
                          <p className="mt-1 text-xs text-gray-500">
                            Last fetched: {formatDate(feed.last_fetched_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteFeed(feed)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-red-400"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Approve Modal */}
      {approving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Approve Article</h2>
              <button onClick={() => setApproving(null)} className="text-gray-400 hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-gray-800 p-4">
                <h3 className="text-white font-medium">{approving.title}</h3>
                <p className="mt-1 text-sm text-gray-400">{approving.source}</p>
              </div>

              {/* Persona */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Persona</label>
                <select
                  value={approveForm.persona_id}
                  onChange={(e) => setApproveForm({ ...approveForm, persona_id: e.target.value })}
                  className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:ring-purple-500 outline-none"
                >
                  <option value="">Select a persona</option>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Platform</label>
                <div className="flex gap-2">
                  {['twitter', 'linkedin'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setApproveForm({ ...approveForm, platform: p as 'twitter' | 'linkedin', social_account_id: '' })}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        approveForm.platform === p
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {p === 'twitter' ? 'Twitter / X' : 'LinkedIn'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Social Account */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Post As</label>
                <select
                  value={approveForm.social_account_id}
                  onChange={(e) => setApproveForm({ ...approveForm, social_account_id: e.target.value })}
                  className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:ring-purple-500 outline-none"
                >
                  <option value="">Select account (optional)</option>
                  {socialAccounts
                    .filter((a) => a.platform === approveForm.platform)
                    .map((a) => (
                      <option key={a.id} value={a.id}>@{a.username}</option>
                    ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Final Content</label>
                <textarea
                  value={approveForm.final_content}
                  onChange={(e) => setApproveForm({ ...approveForm, final_content: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white ring-1 ring-gray-700 focus:ring-purple-500 outline-none resize-none"
                  placeholder="Edit the content before publishing..."
                />
                <div className="mt-1 flex justify-end text-xs text-gray-500">
                  {approveForm.final_content.length} / 280
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setApproving(null)}
                  className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={submitApproval}
                  disabled={submitting || !approveForm.persona_id}
                  className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Approving...' : 'Approve & Queue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Feed Modal */}
      {showAddFeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Add RSS Feed</h2>
              <button onClick={() => setShowAddFeed(false)} className="text-gray-400 hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={newFeed.name}
                  onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
                  placeholder="TechCrunch"
                  className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">RSS URL</label>
                <input
                  type="url"
                  value={newFeed.url}
                  onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
                  placeholder="https://techcrunch.com/feed/"
                  className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Category</label>
                <input
                  type="text"
                  value={newFeed.category}
                  onChange={(e) => setNewFeed({ ...newFeed, category: e.target.value })}
                  placeholder="tech, ai, startup..."
                  className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Priority</label>
                <div className="flex gap-2">
                  {(['high', 'medium', 'low'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewFeed({ ...newFeed, priority: p })}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        newFeed.priority === p
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowAddFeed(false)}
                  className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={addFeed}
                  disabled={addingFeed || !newFeed.name || !newFeed.url}
                  className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {addingFeed ? 'Adding...' : 'Add Feed'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
