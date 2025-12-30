'use client'

import { useState, useEffect, useCallback } from 'react'
import { ConnectAccountModal } from '../../../components/connect-account-modal'

interface SocialAccount {
  id: string
  platform: 'twitter' | 'linkedin'
  username: string
  display_name: string | null
  avatar_url: string | null
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

interface ScheduleConfig {
  platform: 'twitter' | 'linkedin'
  postsPerDay: number
  repliesPerDay: number
  activeHoursStart: number
  activeHoursEnd: number
  activeDays: number[]
  isEnabled: boolean
}

const defaultSchedules: ScheduleConfig[] = [
  {
    platform: 'twitter',
    postsPerDay: 3,
    repliesPerDay: 5,
    activeHoursStart: 9,
    activeHoursEnd: 21,
    activeDays: [1, 2, 3, 4, 5],
    isEnabled: true,
  },
  {
    platform: 'linkedin',
    postsPerDay: 2,
    repliesPerDay: 3,
    activeHoursStart: 8,
    activeHoursEnd: 18,
    activeDays: [1, 2, 3, 4, 5],
    isEnabled: false,
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

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatLastUsed(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [schedules, setSchedules] = useState<ScheduleConfig[]>(defaultSchedules)
  const [activeTab, setActiveTab] = useState<'connections' | 'schedule' | 'subscription'>('connections')
  const [connectModal, setConnectModal] = useState<{
    isOpen: boolean
    platform: 'twitter' | 'linkedin'
  }>({ isOpen: false, platform: 'twitter' })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [connectionToken, setConnectionToken] = useState<string | null>(null)
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/social-accounts')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleConnect = async (data: {
    username: string
    credentials: Record<string, string>
  }) => {
    const res = await fetch('/api/social-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: connectModal.platform,
        username: data.username,
        credentials: data.credentials,
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to connect account')
    }

    await fetchAccounts()
  }

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return

    setActionLoading(accountId)
    try {
      const res = await fetch(`/api/social-accounts/${accountId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to disconnect account')
      }

      await fetchAccounts()
    } catch (error) {
      console.error('Error disconnecting account:', error)
      alert(error instanceof Error ? error.message : 'Failed to disconnect account')
    } finally {
      setActionLoading(null)
    }
  }

  const handleStartSession = async (platform: 'twitter' | 'linkedin') => {
    // Start browser session
    const startRes = await fetch('/api/social-accounts/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    })

    if (!startRes.ok) {
      const error = await startRes.json()
      throw new Error(error.error || 'Failed to start browser session')
    }

    const { sessionId } = await startRes.json()

    // Poll for completion
    const maxAttempts = 60 // 5 minutes with 5 second intervals
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

      const checkRes = await fetch(`/api/social-accounts/session?sessionId=${sessionId}`)
      const data = await checkRes.json()

      if (data.status === 'success') {
        await fetchAccounts()
        return
      }

      if (data.status === 'error' || data.error) {
        throw new Error(data.error || 'Session failed')
      }

      attempts++
    }

    // Timeout - cleanup session
    await fetch(`/api/social-accounts/session?sessionId=${sessionId}`, {
      method: 'DELETE',
    })

    throw new Error('Session timed out. Please try again.')
  }

  const toggleSchedule = (platform: 'twitter' | 'linkedin') => {
    setSchedules(schedules.map(s =>
      s.platform === platform ? { ...s, isEnabled: !s.isEnabled } : s
    ))
  }

  const getAccountByPlatform = (platform: 'twitter' | 'linkedin') => {
    return accounts.find(a => a.platform === platform && a.is_active)
  }

  const generateConnectionToken = async () => {
    setTokenLoading(true)
    try {
      const res = await fetch('/api/connection-token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate token')
      const data = await res.json()
      setConnectionToken(data.token)
      setTokenExpiry(new Date(data.expiresAt))
    } catch (error) {
      console.error('Error generating token:', error)
      alert('Failed to generate connection token')
    } finally {
      setTokenLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const serverUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage your account, connections, and automation settings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="-mb-px flex gap-6">
          {[
            { id: 'connections', label: 'Social Connections' },
            { id: 'schedule', label: 'Schedule' },
            { id: 'subscription', label: 'Subscription' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`border-b-2 pb-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Connections Tab */}
      {activeTab === 'connections' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <h2 className="text-lg font-semibold text-white">Connected Accounts</h2>
            <p className="mt-1 text-sm text-gray-400">
              Connect your social media accounts to enable automation
            </p>

            {isLoading ? (
              <div className="mt-6 flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {(['twitter', 'linkedin'] as const).map((platform) => {
                  const account = getAccountByPlatform(platform)
                  const isConnected = !!account

                  return (
                    <div
                      key={platform}
                      className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4"
                    >
                      <div className="flex items-center gap-4">
                        {platform === 'twitter' ? (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                            <TwitterIcon className="h-6 w-6 text-white" />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
                            <LinkedInIcon className="h-6 w-6 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white capitalize">{platform}</p>
                          {isConnected ? (
                            <p className="text-sm text-gray-400">
                              {account.username} • Last used {formatLastUsed(account.last_used_at)}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">Not connected</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isConnected && (
                          <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
                            Connected
                          </span>
                        )}
                        <button
                          onClick={() =>
                            isConnected
                              ? handleDisconnect(account.id)
                              : setConnectModal({ isOpen: true, platform })
                          }
                          disabled={actionLoading === account?.id}
                          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                            isConnected
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'bg-purple-600 text-white hover:bg-purple-500'
                          }`}
                        >
                          {actionLoading === account?.id
                            ? 'Loading...'
                            : isConnected
                            ? 'Disconnect'
                            : 'Connect'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-6 rounded-lg bg-yellow-500/10 p-4">
              <p className="text-sm text-yellow-400">
                <strong>Note:</strong> Pulsar uses browser automation to post content. Your credentials are encrypted and stored securely.
              </p>
            </div>
          </div>

          {/* Browser Extension Section */}
          <div className="rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Browser Extension</h2>
                <p className="text-sm text-gray-400">
                  Connect accounts using the Chrome Extension (works remotely)
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-gray-800 p-4">
                <h3 className="font-medium text-white">How it works:</h3>
                <ol className="mt-2 space-y-2 text-sm text-gray-400">
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs text-white">1</span>
                    <span>Install the Pulsar Chrome Extension</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs text-white">2</span>
                    <span>Login to Twitter/LinkedIn in your browser (if not already)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs text-white">3</span>
                    <span>Click the Extension and enter the connection info below</span>
                  </li>
                </ol>
              </div>

              {/* Connection Info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Server URL</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={serverUrl}
                      readOnly
                      className="block flex-1 rounded-lg bg-gray-800 px-4 py-2.5 text-white ring-1 ring-gray-700"
                    />
                    <button
                      onClick={() => copyToClipboard(serverUrl)}
                      className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">Connection Token</label>
                  {connectionToken ? (
                    <div className="mt-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={connectionToken}
                          readOnly
                          className="block flex-1 rounded-lg bg-gray-800 px-4 py-2.5 font-mono text-sm text-white ring-1 ring-gray-700"
                        />
                        <button
                          onClick={() => copyToClipboard(connectionToken)}
                          className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600"
                        >
                          Copy
                        </button>
                      </div>
                      {tokenExpiry && (
                        <p className="text-xs text-yellow-400">
                          Expires at {tokenExpiry.toLocaleTimeString()} (one-time use)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1">
                      <button
                        onClick={generateConnectionToken}
                        disabled={tokenLoading}
                        className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
                      >
                        {tokenLoading ? 'Generating...' : 'Generate Token'}
                      </button>
                      <p className="mt-2 text-xs text-gray-500">
                        Token expires in 5 minutes and can only be used once
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-blue-500/10 p-3">
                <p className="text-sm text-blue-400">
                  <strong>Download Extension:</strong>{' '}
                  <a href="/pulsar-extension.zip" download className="underline font-medium">
                    Download Pulsar Chrome Extension
                  </a>
                  {' '}- 解壓後在 Chrome 載入 (chrome://extensions → Developer mode → Load unpacked)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {schedules.map((schedule) => (
            <div
              key={schedule.platform}
              className="rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {schedule.platform === 'twitter' ? (
                    <TwitterIcon className="h-6 w-6 text-gray-400" />
                  ) : (
                    <LinkedInIcon className="h-6 w-6 text-gray-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-white capitalize">
                      {schedule.platform} Schedule
                    </h3>
                    <p className="text-sm text-gray-400">
                      Configure your posting schedule
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSchedule(schedule.platform)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    schedule.isEnabled ? 'bg-purple-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      schedule.isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className={`mt-6 space-y-6 ${!schedule.isEnabled ? 'opacity-50' : ''}`}>
                {/* Posts and Replies */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Posts per day
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={schedule.postsPerDay}
                      disabled={!schedule.isEnabled}
                      className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Replies per day
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={schedule.repliesPerDay}
                      disabled={!schedule.isEnabled}
                      className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Active Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Start hour
                    </label>
                    <select
                      value={schedule.activeHoursStart}
                      disabled={!schedule.isEnabled}
                      className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      End hour
                    </label>
                    <select
                      value={schedule.activeHoursEnd}
                      disabled={!schedule.isEnabled}
                      className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Active days
                  </label>
                  <div className="mt-2 flex gap-2">
                    {dayNames.map((day, index) => (
                      <button
                        key={day}
                        disabled={!schedule.isEnabled}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                          schedule.activeDays.includes(index)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-500">
            Save Schedule Settings
          </button>
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* Current Plan */}
          <div className="rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <h2 className="text-lg font-semibold text-white">Current Plan</h2>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">Free</p>
                <p className="mt-1 text-sm text-gray-400">
                  Limited access • No social platforms connected
                </p>
              </div>
              <span className="rounded-full bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300">
                $0/month
              </span>
            </div>
          </div>

          {/* Plan Comparison */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              {
                name: 'Starter',
                price: '$29',
                features: ['1 platform', '3 posts/day', '5 replies/day', '10 tracked accounts'],
              },
              {
                name: 'Pro',
                price: '$79',
                features: ['2 platforms', '10 posts/day', '20 replies/day', '50 tracked accounts'],
                popular: true,
              },
              {
                name: 'Agency',
                price: '$199',
                features: ['5 platforms', '20 posts/day', '50 replies/day', '200 tracked accounts'],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 ${
                  plan.popular
                    ? 'bg-purple-600 ring-2 ring-purple-400'
                    : 'bg-gray-900 ring-1 ring-gray-800'
                }`}
              >
                {plan.popular && (
                  <span className="mb-2 inline-block rounded-full bg-purple-400 px-3 py-1 text-xs font-medium text-purple-900">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold text-white">
                  {plan.price}<span className="text-sm font-normal text-gray-300">/mo</span>
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                      <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-6 w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    plan.popular
                      ? 'bg-white text-purple-600 hover:bg-gray-100'
                      : 'bg-purple-600 text-white hover:bg-purple-500'
                  }`}
                >
                  Upgrade to {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connect Account Modal */}
      <ConnectAccountModal
        platform={connectModal.platform}
        isOpen={connectModal.isOpen}
        onClose={() => setConnectModal({ ...connectModal, isOpen: false })}
        onConnect={handleConnect}
        onStartSession={handleStartSession}
      />
    </div>
  )
}
