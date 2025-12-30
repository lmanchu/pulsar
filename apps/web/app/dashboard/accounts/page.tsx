'use client'

import { useState } from 'react'

interface TrackedAccount {
  id: string
  handle: string
  displayName: string
  platform: 'twitter' | 'linkedin'
  category: string
  priority: number
  isEnabled: boolean
  lastEngagedAt: string | null
}

const mockAccounts: TrackedAccount[] = [
  {
    id: '1',
    handle: '@elonmusk',
    displayName: 'Elon Musk',
    platform: 'twitter',
    category: 'Tech Leader',
    priority: 10,
    isEnabled: true,
    lastEngagedAt: '2 hours ago',
  },
  {
    id: '2',
    handle: '@paulg',
    displayName: 'Paul Graham',
    platform: 'twitter',
    category: 'Investor',
    priority: 9,
    isEnabled: true,
    lastEngagedAt: '1 day ago',
  },
  {
    id: '3',
    handle: 'satya-nadella',
    displayName: 'Satya Nadella',
    platform: 'linkedin',
    category: 'Tech Leader',
    priority: 8,
    isEnabled: true,
    lastEngagedAt: null,
  },
  {
    id: '4',
    handle: '@sama',
    displayName: 'Sam Altman',
    platform: 'twitter',
    category: 'AI',
    priority: 10,
    isEnabled: false,
    lastEngagedAt: '3 days ago',
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

function PriorityBadge({ priority }: { priority: number }) {
  const getColor = () => {
    if (priority >= 9) return 'bg-red-500/10 text-red-400 ring-red-500/20'
    if (priority >= 7) return 'bg-orange-500/10 text-orange-400 ring-orange-500/20'
    if (priority >= 5) return 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'
    return 'bg-gray-500/10 text-gray-400 ring-gray-500/20'
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getColor()}`}>
      P{priority}
    </span>
  )
}

export default function AccountsPage() {
  const [accounts] = useState<TrackedAccount[]>(mockAccounts)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'twitter' | 'linkedin'>('all')

  const filteredAccounts = accounts.filter((account) => {
    if (filter === 'all') return true
    return account.platform === filter
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tracked Accounts</h1>
          <p className="mt-1 text-sm text-gray-400">
            Accounts to monitor and engage with automatically
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Account
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'twitter', 'linkedin'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? 'All' : f === 'twitter' ? 'Twitter' : 'LinkedIn'}
          </button>
        ))}
      </div>

      {/* Accounts Table */}
      <div className="rounded-xl bg-gray-900 ring-1 ring-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Account
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Priority
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Last Engaged
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredAccounts.map((account) => (
              <tr key={account.id} className="hover:bg-gray-800/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {account.platform === 'twitter' ? (
                      <TwitterIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <LinkedInIcon className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium text-white">{account.displayName}</p>
                      <p className="text-sm text-gray-400">{account.handle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300">
                    {account.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <PriorityBadge priority={account.priority} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {account.lastEngagedAt || 'Never'}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      account.isEnabled
                        ? 'bg-green-500/10 text-green-400 ring-green-500/20'
                        : 'bg-gray-500/10 text-gray-400 ring-gray-500/20'
                    }`}
                  >
                    {account.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-red-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Add Tracked Account</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Platform</label>
                <select className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="twitter">Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Handle</label>
                <input
                  type="text"
                  placeholder="@username or profile URL"
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Category</label>
                <input
                  type="text"
                  placeholder="e.g., Tech Leader, Investor, Competitor"
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Priority (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  defaultValue="5"
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="mt-1 text-xs text-gray-500">Higher priority accounts are engaged with first</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
                >
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
