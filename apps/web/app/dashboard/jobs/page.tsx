'use client'

import { useState } from 'react'

interface ContentJob {
  id: string
  type: 'post' | 'reply'
  platform: 'twitter' | 'linkedin'
  status: 'pending' | 'generating' | 'ready' | 'posting' | 'completed' | 'failed'
  content: string
  targetUrl?: string
  personaName: string
  scheduledAt: string | null
  createdAt: string
  errorMessage?: string
}

const mockJobs: ContentJob[] = [
  {
    id: '1',
    type: 'post',
    platform: 'twitter',
    status: 'completed',
    content: 'Building in public is underrated. Every failure is a lesson, every win is validation. The journey is the destination.',
    personaName: 'Tech Founder',
    scheduledAt: null,
    createdAt: '2 hours ago',
  },
  {
    id: '2',
    type: 'reply',
    platform: 'twitter',
    status: 'pending',
    content: 'Great insight! The key is consistency. Most people give up right before the inflection point.',
    targetUrl: 'https://twitter.com/paulg/status/123456',
    personaName: 'Tech Founder',
    scheduledAt: '2024-01-15 09:00',
    createdAt: '1 hour ago',
  },
  {
    id: '3',
    type: 'post',
    platform: 'linkedin',
    status: 'failed',
    content: 'Lessons from scaling to 10M users...',
    personaName: 'Growth Expert',
    scheduledAt: null,
    createdAt: '30 min ago',
    errorMessage: 'Session expired. Please reconnect your LinkedIn account.',
  },
  {
    id: '4',
    type: 'post',
    platform: 'twitter',
    status: 'generating',
    content: '',
    personaName: 'Tech Founder',
    scheduledAt: null,
    createdAt: '5 min ago',
  },
  {
    id: '5',
    type: 'reply',
    platform: 'linkedin',
    status: 'ready',
    content: 'This resonates deeply. The best leaders I know are the ones who admit they don\'t have all the answers.',
    targetUrl: 'https://linkedin.com/posts/satya-nadella/123',
    personaName: 'Growth Expert',
    scheduledAt: '2024-01-15 14:00',
    createdAt: '15 min ago',
  },
]

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
  const [jobs] = useState<ContentJob[]>(mockJobs)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all')
  const [selectedJob, setSelectedJob] = useState<ContentJob | null>(null)

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true
    if (filter === 'pending') return ['pending', 'generating', 'ready', 'posting'].includes(job.status)
    return job.status === filter
  })

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
        <button className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Job
        </button>
      </div>

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
                      {job.type}
                    </span>
                    <StatusBadge status={job.status} />
                    <span className="text-sm text-gray-500">by {job.personaName}</span>
                  </div>

                  {job.content ? (
                    <p className="mt-2 text-sm text-gray-300 line-clamp-2">{job.content}</p>
                  ) : (
                    <p className="mt-2 text-sm italic text-gray-500">Generating content...</p>
                  )}

                  {job.targetUrl && (
                    <p className="mt-2 text-xs text-gray-500">
                      Replying to: <a href={job.targetUrl} className="text-purple-400 hover:underline">{job.targetUrl}</a>
                    </p>
                  )}

                  {job.errorMessage && (
                    <p className="mt-2 text-sm text-red-400">{job.errorMessage}</p>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span>Created {job.createdAt}</span>
                    {job.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Scheduled: {job.scheduledAt}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {job.status === 'ready' && (
                  <button className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-500">
                    Post Now
                  </button>
                )}
                {job.status === 'failed' && (
                  <button className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700">
                    Retry
                  </button>
                )}
                <button
                  onClick={() => setSelectedJob(job)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button className="rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-red-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white capitalize">{selectedJob.type} Details</h2>
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
                  <p className="font-medium text-white">{selectedJob.personaName}</p>
                </div>
              </div>

              {selectedJob.targetUrl && (
                <div>
                  <p className="text-sm text-gray-400">Target URL</p>
                  <a href={selectedJob.targetUrl} className="text-purple-400 hover:underline break-all">
                    {selectedJob.targetUrl}
                  </a>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-400">Content</p>
                <div className="mt-2 rounded-lg bg-gray-800 p-4">
                  <p className="text-white whitespace-pre-wrap">{selectedJob.content || 'Content is being generated...'}</p>
                </div>
              </div>

              {selectedJob.errorMessage && (
                <div className="rounded-lg bg-red-500/10 p-4">
                  <p className="text-sm font-medium text-red-400">Error</p>
                  <p className="mt-1 text-sm text-red-300">{selectedJob.errorMessage}</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                {selectedJob.status === 'ready' && (
                  <button className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500">
                    Post Now
                  </button>
                )}
                {selectedJob.status === 'failed' && (
                  <button className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500">
                    Retry
                  </button>
                )}
                <button className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700">
                  Edit Content
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
