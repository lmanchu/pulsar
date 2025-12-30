'use client'

import { useState, useEffect, useCallback } from 'react'

interface SocialAccount {
  id: string
  platform: string
  username: string
}

interface Persona {
  id: string
  name: string
  bio: string | null
  tone: string | null
  topics: string[]
  platform: 'twitter' | 'linkedin'
  avoid_phrases: string[]
  example_posts: string[]
  is_active: boolean
  social_accounts: SocialAccount | null
}

interface FormData {
  name: string
  bio: string
  tone: string
  topics: string
  platform: 'twitter' | 'linkedin'
  social_account_id: string
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

const initialFormData: FormData = {
  name: '',
  bio: '',
  tone: 'professional',
  topics: '',
  platform: 'twitter',
  social_account_id: '',
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchPersonas = useCallback(async () => {
    try {
      const response = await fetch('/api/personas')
      if (!response.ok) throw new Error('Failed to fetch personas')
      const data = await response.json()
      setPersonas(data.personas || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load personas')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchSocialAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/social-accounts')
      if (!response.ok) throw new Error('Failed to fetch accounts')
      const data = await response.json()
      setSocialAccounts(data.accounts || [])
    } catch {
      // Silent fail - accounts are optional
    }
  }, [])

  useEffect(() => {
    fetchPersonas()
    fetchSocialAccounts()
  }, [fetchPersonas, fetchSocialAccounts])

  const openCreateModal = () => {
    setEditingPersona(null)
    setFormData(initialFormData)
    setIsModalOpen(true)
  }

  const openEditModal = (persona: Persona) => {
    setEditingPersona(persona)
    setFormData({
      name: persona.name,
      bio: persona.bio || '',
      tone: persona.tone || 'professional',
      topics: persona.topics.join(', '),
      platform: persona.platform,
      social_account_id: persona.social_accounts?.id || '',
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPersona(null)
    setFormData(initialFormData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        name: formData.name,
        bio: formData.bio || null,
        tone: formData.tone,
        topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
        platform: formData.platform,
        social_account_id: formData.social_account_id || null,
      }

      const url = editingPersona
        ? `/api/personas/${editingPersona.id}`
        : '/api/personas'

      const method = editingPersona ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save persona')
      }

      await fetchPersonas()
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save persona')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (personaId: string) => {
    if (!confirm('Are you sure you want to delete this persona?')) return

    try {
      const response = await fetch(`/api/personas/${personaId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete persona')

      await fetchPersonas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete persona')
    }
  }

  const toggleActive = async (persona: Persona) => {
    try {
      const response = await fetch(`/api/personas/${persona.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !persona.is_active }),
      })

      if (!response.ok) throw new Error('Failed to update persona')

      await fetchPersonas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update persona')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Error Banner */}
      {error && (
        <div className="rounded-lg bg-red-500/10 p-4 text-red-400 ring-1 ring-red-500/20">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Personas</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your AI content generation personas
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Persona
        </button>
      </div>

      {/* Personas Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {personas.map((persona) => (
          <div
            key={persona.id}
            className="rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800 transition-colors hover:ring-purple-500/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600">
                  <span className="text-lg font-semibold text-white">
                    {persona.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{persona.name}</h3>
                  <div className="flex items-center gap-2">
                    {persona.platform === 'twitter' ? (
                      <TwitterIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <LinkedInIcon className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-400 capitalize">{persona.platform}</span>
                    {persona.social_accounts && (
                      <span className="text-sm text-gray-500">@{persona.social_accounts.username}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(persona)}
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                    persona.is_active
                      ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20 hover:bg-green-500/20'
                      : 'bg-gray-500/10 text-gray-400 ring-1 ring-gray-500/20 hover:bg-gray-500/20'
                  }`}
                >
                  {persona.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDelete(persona.id)}
                  className="rounded p-1 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Delete persona"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>

            {persona.bio && (
              <p className="mt-4 text-sm text-gray-300">{persona.bio}</p>
            )}

            {persona.tone && (
              <div className="mt-4">
                <span className="text-xs font-medium text-gray-500">Tone</span>
                <p className="mt-1 text-sm text-gray-300 capitalize">{persona.tone}</p>
              </div>
            )}

            {persona.topics.length > 0 && (
              <div className="mt-4">
                <span className="text-xs font-medium text-gray-500">Topics</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {persona.topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400 ring-1 ring-purple-500/20"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3 border-t border-gray-800 pt-4">
              <button
                onClick={() => openEditModal(persona)}
                className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                Edit
              </button>
              <button className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500">
                Generate Content
              </button>
            </div>
          </div>
        ))}

        {/* Add New Card */}
        <button
          onClick={openCreateModal}
          className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-800 p-6 transition-colors hover:border-purple-500/50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-gray-400">Create New Persona</p>
          <p className="mt-1 text-xs text-gray-500">Define a new AI persona for content generation</p>
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {editingPersona ? 'Edit Persona' : 'Create New Persona'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Tech Founder"
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Bio</label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Describe this persona's background and expertise..."
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value as 'twitter' | 'linkedin' })}
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="twitter">Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>

              {socialAccounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300">Linked Account (Optional)</label>
                  <select
                    value={formData.social_account_id}
                    onChange={(e) => setFormData({ ...formData, social_account_id: e.target.value })}
                    className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">No linked account</option>
                    {socialAccounts
                      .filter(a => a.platform === formData.platform)
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          @{account.username}
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300">Tone</label>
                <select
                  value={formData.tone}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="professional">Professional</option>
                  <option value="conversational">Conversational</option>
                  <option value="witty">Witty</option>
                  <option value="educational">Educational</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Topics (comma separated)</label>
                <input
                  type="text"
                  value={formData.topics}
                  onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                  placeholder="e.g., startups, AI, product"
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingPersona ? 'Save Changes' : 'Create Persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
