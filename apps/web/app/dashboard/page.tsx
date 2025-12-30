const stats = [
  { name: 'Posts Today', value: '0', limit: '3', platform: 'twitter' },
  { name: 'Replies Today', value: '0', limit: '5', platform: 'twitter' },
  { name: 'Posts Today', value: '0', limit: '3', platform: 'linkedin' },
  { name: 'Replies Today', value: '0', limit: '5', platform: 'linkedin' },
]

const recentJobs = [
  { id: 1, type: 'post', platform: 'twitter', status: 'completed', content: 'Building in public is underrated...', createdAt: '2 hours ago' },
  { id: 2, type: 'reply', platform: 'twitter', status: 'pending', content: 'Great insight! I think...', createdAt: '1 hour ago' },
  { id: 3, type: 'post', platform: 'linkedin', status: 'failed', content: 'Lessons from scaling...', createdAt: '30 min ago' },
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
  const colors = {
    completed: 'bg-green-500/10 text-green-400 ring-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
    failed: 'bg-red-500/10 text-red-400 ring-red-500/20',
    processing: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${colors[status as keyof typeof colors] || colors.pending}`}>
      {status}
    </span>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">
          Your social media automation at a glance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{stat.name}</span>
              {stat.platform === 'twitter' ? (
                <TwitterIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <LinkedInIcon className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <div className="mt-2 flex items-baseline">
              <span className="text-3xl font-semibold text-white">{stat.value}</span>
              <span className="ml-2 text-sm text-gray-500">/ {stat.limit}</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-gray-800">
              <div
                className="h-2 rounded-full bg-purple-600"
                style={{ width: `${(parseInt(stat.value) / parseInt(stat.limit)) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 font-medium text-white transition-colors hover:bg-purple-500">
          <TwitterIcon className="h-5 w-5" />
          Create Twitter Post
        </button>
        <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-500">
          <LinkedInIcon className="h-5 w-5" />
          Create LinkedIn Post
        </button>
        <button className="flex items-center justify-center gap-2 rounded-xl bg-gray-800 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-700">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Schedule Content
        </button>
      </div>

      {/* Recent Jobs */}
      <div className="rounded-xl bg-gray-900 ring-1 ring-gray-800">
        <div className="border-b border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Recent Content Jobs</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {recentJobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                {job.platform === 'twitter' ? (
                  <TwitterIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <LinkedInIcon className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-white">
                    {job.type === 'post' ? 'New Post' : 'Reply'}
                  </p>
                  <p className="mt-1 text-sm text-gray-400 line-clamp-1">
                    {job.content}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={job.status} />
                <span className="text-sm text-gray-500">{job.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 px-6 py-4">
          <a href="/dashboard/jobs" className="text-sm font-medium text-purple-400 hover:text-purple-300">
            View all jobs &rarr;
          </a>
        </div>
      </div>
    </div>
  )
}
