'use client'

import { useState, useEffect } from 'react'

interface ContentJob {
  id: string
  job_type: 'post' | 'reply'
  platform: 'twitter' | 'linkedin'
  status: 'pending' | 'generating' | 'ready' | 'posting' | 'completed' | 'failed'
  target_url?: string
  target_content?: string
  generated_content?: string
  final_content?: string
  error_message?: string
  scheduled_at?: string
  posted_at?: string
  post_url?: string
  created_at: string
  updated_at: string
  persona: { id: string; name: string } | null
  social_account: { id: string; username: string; platform: string } | null
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

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
    generating: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
    ready: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
    posting: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
    completed: 'bg-green-500/10 text-green-400 ring-green-500/20',
    failed: 'bg-red-500/10 text-red-400 ring-red-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${styles[status] || styles.pending}`}>
      {status}
    </span>
  )
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<ContentJob[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all')
  const [selectedJob, setSelectedJob] = useState<ContentJob | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingJob, setEditingJob] = useState<ContentJob | null>(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [posting, setPosting] = useState<string | null>(null)

  // Create job form state
  const [newJob, setNewJob] = useState({
    persona_id: '',
    social_account_id: '',
    platform: 'twitter' as 'twitter' | 'linkedin',
    job_type: 'post' as 'post' | 'reply',
    target_url: '',
  })

  useEffect(() => {
    fetchJobs()
    fetchPersonas()
    fetchSocialAccounts()
  }, [])

  async function fetchJobs() {
    try {
      const res = await fetch('/api/content-jobs')
      const data = await res.json()
      if (res.ok) {
        setJobs(data.jobs || [])
      } else {
        setError(data.error || 'Failed to fetch jobs')
      }
    } catch (err) {
      setError('Failed to fetch jobs')
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

  async function createJob() {
    if (!newJob.persona_id) {
      alert('Please select a persona')
      return
    }
    if (!newJob.social_account_id) {
      alert('Please select a social account')
      return
    }
    if (newJob.job_type === 'reply' && !newJob.target_url) {
      alert('Reply jobs require a target URL')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/content-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob),
      })
      const data = await res.json()
      if (res.ok) {
        setShowCreateModal(false)
        setNewJob({ persona_id: '', social_account_id: '', platform: 'twitter', job_type: 'post', target_url: '' })
        fetchJobs() // Refresh list
      } else {
        alert(data.error || 'Failed to create job')
      }
    } catch (err) {
      alert('Failed to create job')
    } finally {
      setCreating(false)
    }
  }

  function startEditing(job: ContentJob) {
    setEditingJob(job)
    setEditContent(job.final_content || job.generated_content || '')
    setSelectedJob(null)
  }

  async function saveEdit() {
    if (!editingJob) return

    setSaving(true)
    try {
      const res = await fetch(`/api/content-jobs/${editingJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_content: editContent }),
      })
      const data = await res.json()
      if (res.ok) {
        setEditingJob(null)
        setEditContent('')
        fetchJobs()
      } else {
        alert(data.error || 'Failed to save')
      }
    } catch (err) {
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function deleteJob(jobId: string) {
    if (!confirm('Are you sure you want to delete this job?')) return

    setDeleting(jobId)
    try {
      const res = await fetch(`/api/content-jobs/${jobId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSelectedJob(null)
        fetchJobs()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete job')
      }
    } catch (err) {
      alert('Failed to delete job')
    } finally {
      setDeleting(null)
    }
  }

  async function postNow(job: ContentJob) {
    if (!job.social_account) {
      alert('No social account connected. Please connect an account first.')
      return
    }

    setPosting(job.id)
    try {
      const res = await fetch(`/api/content-jobs/${job.id}/post`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        setSelectedJob(null)
        fetchJobs()
        alert('Content posted successfully!')
      } else {
        alert(data.error || 'Failed to post content')
      }
    } catch (err) {
      alert('Failed to post content')
    } finally {
      setPosting(null)
    }
  }

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true
    if (filter === 'pending') return ['pending', 'generating', 'ready', 'posting'].includes(job.status)
    return job.status === filter
  })

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${diffDays} days ago`
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
          onClick={() => { setError(null); setLoading(true); fetchJobs(); }}
          className="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Jobs</h1>
          <p className="mt-1 text-sm text-gray-400">
            View and manage your scheduled and completed content
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Job
        </button>
      </div>

      {/* Empty state */}
      {jobs.length === 0 && (
        <div className="rounded-xl bg-gray-900 p-12 text-center ring-1 ring-gray-800">
          <p className="text-gray-400">No content jobs yet</p>
          <p className="mt-2 text-sm text-gray-500">Create your first job to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
          >
            Create Job
          </button>
        </div>
      )}

      {jobs.length > 0 && (
        <>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pending', count: jobs.filter(j => ['pending', 'generating', 'ready', 'posting'].includes(j.status)).length, color: 'text-yellow-400' },
          { label: 'Completed', count: jobs.filter(j => j.status === 'completed').length, color: 'text-green-400' },
          { label: 'Failed', count: jobs.filter(j => j.status === 'failed').length, color: 'text-red-400' },
          { label: 'Total', count: jobs.length, color: 'text-white' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-gray-900 p-4 ring-1 ring-gray-800">
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'completed', 'failed'] as const).map((f) => (
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

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800 transition-colors hover:ring-purple-500/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {job.platform === 'twitter' ? (
                  <TwitterIcon className="mt-1 h-5 w-5 text-gray-400" />
                ) : (
                  <LinkedInIcon className="mt-1 h-5 w-5 text-gray-400" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white capitalize">
                      {job.job_type}
                    </span>
                    <StatusBadge status={job.status} />
                    <span className="text-sm text-gray-500">by {job.persona?.name || 'Unknown'}</span>
                  </div>

                  {job.final_content || job.generated_content ? (
                    <p className="mt-2 text-sm text-gray-300 line-clamp-2">{job.final_content || job.generated_content}</p>
                  ) : (
                    <p className="mt-2 text-sm italic text-gray-500">Generating content...</p>
                  )}

                  {job.target_url && (
                    <p className="mt-2 text-xs text-gray-500">
                      Replying to: <a href={job.target_url} className="text-purple-400 hover:underline">{job.target_url}</a>
                    </p>
                  )}

                  {job.error_message && (
                    <p className="mt-2 text-sm text-red-400">{job.error_message}</p>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span>Created {formatDate(job.created_at)}</span>
                    {job.scheduled_at && (
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Scheduled: {new Date(job.scheduled_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {job.status === 'ready' && (
                  <button
                    onClick={() => postNow(job)}
                    disabled={posting === job.id}
                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-wait"
                  >
                    {posting === job.id ? 'Posting...' : 'Post Now'}
                  </button>
                )}
                {job.status === 'failed' && (
                  <button
                    onClick={() => postNow(job)}
                    disabled={posting === job.id}
                    className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                  >
                    {posting === job.id ? 'Retrying...' : 'Retry'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedJob(job)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                  title="View details"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  onClick={() => startEditing(job)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-purple-400"
                  title="Edit content"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteJob(job.id)}
                  disabled={deleting === job.id}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-red-400 disabled:opacity-50 disabled:cursor-wait"
                  title="Delete job"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      </>
      )}

      {/* Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white capitalize">{selectedJob.job_type} Details</h2>
                <StatusBadge status={selectedJob.status} />
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-4">
                {selectedJob.platform === 'twitter' ? (
                  <TwitterIcon className="h-6 w-6 text-gray-400" />
                ) : (
                  <LinkedInIcon className="h-6 w-6 text-gray-400" />
                )}
                <div>
                  <p className="text-sm text-gray-400">Platform</p>
                  <p className="font-medium text-white capitalize">{selectedJob.platform}</p>
                </div>
                <div className="ml-8">
                  <p className="text-sm text-gray-400">Persona</p>
                  <p className="font-medium text-white">{selectedJob.persona?.name || 'Unknown'}</p>
                </div>
              </div>

              {selectedJob.target_url && (
                <div>
                  <p className="text-sm text-gray-400">Target URL</p>
                  <a href={selectedJob.target_url} className="text-purple-400 hover:underline break-all">
                    {selectedJob.target_url}
                  </a>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-400">Content</p>
                <div className="mt-2 rounded-lg bg-gray-800 p-4">
                  <p className="text-white whitespace-pre-wrap">{selectedJob.final_content || selectedJob.generated_content || 'Content is being generated...'}</p>
                </div>
              </div>

              {selectedJob.error_message && (
                <div className="rounded-lg bg-red-500/10 p-4">
                  <p className="text-sm font-medium text-red-400">Error</p>
                  <p className="mt-1 text-sm text-red-300">{selectedJob.error_message}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                {selectedJob.status === 'ready' && (
                  <button
                    onClick={() => postNow(selectedJob)}
                    disabled={posting === selectedJob.id}
                    className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:bg-purple-600/50"
                  >
                    {posting === selectedJob.id ? 'Posting...' : 'Post Now'}
                  </button>
                )}
                {selectedJob.status === 'failed' && (
                  <button
                    onClick={() => postNow(selectedJob)}
                    disabled={posting === selectedJob.id}
                    className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
                  >
                    {posting === selectedJob.id ? 'Retrying...' : 'Retry'}
                  </button>
                )}
                <button
                  onClick={() => startEditing(selectedJob)}
                  className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  Edit Content
                </button>
                <button
                  onClick={() => deleteJob(selectedJob.id)}
                  disabled={deleting === selectedJob.id}
                  className="rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/30 disabled:opacity-50"
                >
                  {deleting === selectedJob.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Content Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Edit Content</h2>
              <button
                onClick={() => { setEditingJob(null); setEditContent(''); }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <span className="capitalize">{editingJob.platform}</span>
                <span>•</span>
                <span className="capitalize">{editingJob.job_type}</span>
                <span>•</span>
                <span>{editingJob.persona?.name}</span>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
                className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white ring-1 ring-gray-700 focus:ring-purple-500 outline-none resize-none"
                placeholder="Enter your content..."
              />
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>{editContent.length} characters</span>
                <span>{editingJob.platform === 'twitter' ? '280 max recommended' : '3000 max'}</span>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => { setEditingJob(null); setEditContent(''); }}
                className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !editContent.trim()}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Create Content Job</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {/* Persona */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Persona</label>
                <select
                  value={newJob.persona_id}
                  onChange={(e) => setNewJob({ ...newJob, persona_id: e.target.value })}
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
                      onClick={() => setNewJob({ ...newJob, platform: p as 'twitter' | 'linkedin', social_account_id: '' })}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        newJob.platform === p
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
                  value={newJob.social_account_id}
                  onChange={(e) => setNewJob({ ...newJob, social_account_id: e.target.value })}
                  className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:ring-purple-500 outline-none"
                >
                  <option value="">Select account</option>
                  {socialAccounts
                    .filter((a) => a.platform === newJob.platform)
                    .map((a) => (
                      <option key={a.id} value={a.id}>@{a.username}</option>
                    ))}
                </select>
                {socialAccounts.filter((a) => a.platform === newJob.platform).length === 0 && (
                  <p className="mt-1 text-xs text-yellow-400">
                    No {newJob.platform} account connected. Go to Settings to connect.
                  </p>
                )}
              </div>

              {/* Job Type */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Type</label>
                <div className="flex gap-2">
                  {['post', 'reply'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewJob({ ...newJob, job_type: t as 'post' | 'reply' })}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        newJob.job_type === t
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target URL (for replies) */}
              {newJob.job_type === 'reply' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Target URL</label>
                  <input
                    type="url"
                    value={newJob.target_url}
                    onChange={(e) => setNewJob({ ...newJob, target_url: e.target.value })}
                    placeholder="https://twitter.com/user/status/123"
                    className="w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:ring-purple-500 outline-none"
                  />
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={createJob}
                  disabled={creating || !newJob.persona_id || !newJob.social_account_id}
                  className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
