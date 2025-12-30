'use client'

import { useState } from 'react'

type AuthMethod = 'session' | 'credentials'

interface ConnectAccountModalProps {
  platform: 'twitter' | 'linkedin'
  isOpen: boolean
  onClose: () => void
  onConnect: (data: { username: string; credentials: Record<string, string> }) => Promise<void>
  onStartSession?: (platform: 'twitter' | 'linkedin') => Promise<void>
}

export function ConnectAccountModal({
  platform,
  isOpen,
  onClose,
  onConnect,
  onStartSession,
}: ConnectAccountModalProps) {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('session')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'waiting' | 'success' | 'error'>('idle')

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
  })

  if (!isOpen) return null

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const credentials: Record<string, string> =
        platform === 'twitter'
          ? {
              username: formData.username,
              password: formData.password,
              email: formData.email,
            }
          : {
              email: formData.username,
              password: formData.password,
            }

      await onConnect({
        username: platform === 'twitter' ? formData.username : formData.username,
        credentials,
      })

      setFormData({ username: '', password: '', email: '' })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect account')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartSession = async () => {
    if (!onStartSession) {
      setError('Session-based auth not available')
      return
    }

    setError(null)
    setSessionStatus('waiting')

    try {
      await onStartSession(platform)
      setSessionStatus('success')
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setSessionStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to start browser session')
    }
  }

  const platformName = platform === 'twitter' ? 'Twitter / X' : 'LinkedIn'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl bg-gray-900 p-6 shadow-xl ring-1 ring-gray-800">
        <h2 className="text-xl font-semibold text-white">
          Connect {platformName}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Choose how to connect your {platformName} account
        </p>

        {/* Auth Method Tabs */}
        <div className="mt-4 flex gap-2 rounded-lg bg-gray-800 p-1">
          <button
            type="button"
            onClick={() => setAuthMethod('session')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              authMethod === 'session'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Browser Session
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('credentials')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              authMethod === 'credentials'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Credentials
          </button>
        </div>

        {/* Session Auth */}
        {authMethod === 'session' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg bg-gray-800 p-4">
              <h3 className="font-medium text-white">How it works:</h3>
              <ol className="mt-2 space-y-2 text-sm text-gray-400">
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs text-white">1</span>
                  <span>Click &quot;Open Browser&quot; below</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs text-white">2</span>
                  <span>Login to {platformName} (use Google OAuth if you prefer)</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs text-white">3</span>
                  <span>We&apos;ll capture your session automatically</span>
                </li>
              </ol>
            </div>

            <div className="rounded-lg bg-green-500/10 p-3">
              <p className="text-sm text-green-400">
                <strong>Recommended:</strong> No password needed. Works with Google OAuth, Apple ID, or any login method.
              </p>
            </div>

            {sessionStatus === 'waiting' && (
              <div className="rounded-lg bg-blue-500/10 p-3">
                <p className="text-sm text-blue-400">
                  Waiting for you to complete login in the browser window...
                </p>
              </div>
            )}

            {sessionStatus === 'success' && (
              <div className="rounded-lg bg-green-500/10 p-3">
                <p className="text-sm text-green-400">
                  ✓ Session captured successfully!
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
                disabled={sessionStatus === 'waiting'}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartSession}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
                disabled={sessionStatus === 'waiting' || sessionStatus === 'success'}
              >
                {sessionStatus === 'waiting' ? 'Waiting...' : 'Open Browser'}
              </button>
            </div>
          </div>
        )}

        {/* Credentials Auth */}
        {authMethod === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                {platform === 'twitter' ? 'Username or Email' : 'Email'}
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2.5 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={
                  platform === 'twitter' ? '@username or email' : 'your@email.com'
                }
                required
              />
            </div>

            {platform === 'twitter' && (
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Email (for verification)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2.5 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="your@email.com"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Twitter may ask for email verification
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2.5 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="rounded-lg bg-yellow-500/10 p-3">
              <p className="text-sm text-yellow-400">
                <strong>Security:</strong> Your credentials are encrypted with
                AES-256-GCM and stored securely.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
