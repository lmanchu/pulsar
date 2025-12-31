'use client'

import { useState, useEffect, useCallback } from 'react'

interface SocialAccount {
  id: string
  platform: string
  username: string
}

interface WritingStyle {
  opening_patterns?: string[]
  emphasis_patterns?: string[]
  closing_patterns?: string[]
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
  mbti_type?: string | null
  writing_style?: WritingStyle | null
  social_accounts: SocialAccount | null
}

interface FormData {
  name: string
  bio: string
  tone: string
  topics: string
  platform: 'twitter' | 'linkedin'
  social_account_id: string
  avoid_phrases: string
  example_posts: string
}

interface GenerateFormData {
  mbti_type: string
  platform: 'twitter' | 'linkedin'
  linkedin_url: string
  twitter_url: string
  instagram_url: string
  facebook_url: string
  file_content: string
  file_name: string
}

type MBTIType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP'

const MBTI_TYPES: { type: MBTIType; name: string; category: string }[] = [
  // Analysts
  { type: 'INTJ', name: 'Architect', category: 'Analysts' },
  { type: 'INTP', name: 'Logician', category: 'Analysts' },
  { type: 'ENTJ', name: 'Commander', category: 'Analysts' },
  { type: 'ENTP', name: 'Debater', category: 'Analysts' },
  // Diplomats
  { type: 'INFJ', name: 'Advocate', category: 'Diplomats' },
  { type: 'INFP', name: 'Mediator', category: 'Diplomats' },
  { type: 'ENFJ', name: 'Protagonist', category: 'Diplomats' },
  { type: 'ENFP', name: 'Campaigner', category: 'Diplomats' },
  // Sentinels
  { type: 'ISTJ', name: 'Logistician', category: 'Sentinels' },
  { type: 'ISFJ', name: 'Defender', category: 'Sentinels' },
  { type: 'ESTJ', name: 'Executive', category: 'Sentinels' },
  { type: 'ESFJ', name: 'Consul', category: 'Sentinels' },
  // Explorers
  { type: 'ISTP', name: 'Virtuoso', category: 'Explorers' },
  { type: 'ISFP', name: 'Adventurer', category: 'Explorers' },
  { type: 'ESTP', name: 'Entrepreneur', category: 'Explorers' },
  { type: 'ESFP', name: 'Entertainer', category: 'Explorers' },
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

const initialFormData: FormData = {
  name: '',
  bio: '',
  tone: 'professional',
  topics: '',
  platform: 'twitter',
  social_account_id: '',
  avoid_phrases: '',
  example_posts: '',
}

const initialGenerateFormData: GenerateFormData = {
  mbti_type: 'INTJ',
  platform: 'twitter',
  linkedin_url: '',
  twitter_url: '',
  instagram_url: '',
  facebook_url: '',
  file_content: '',
  file_name: '',
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

  // AI Generation state
  const [modalTab, setModalTab] = useState<'manual' | 'ai'>('ai')
  const [generateFormData, setGenerateFormData] = useState<GenerateFormData>(initialGenerateFormData)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPersona, setGeneratedPersona] = useState<Partial<Persona> | null>(null)

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
    setGenerateFormData(initialGenerateFormData)
    setGeneratedPersona(null)
    setModalTab('ai')
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
      avoid_phrases: persona.avoid_phrases.join(', '),
      example_posts: persona.example_posts.join('\n---\n'),
    })
    setModalTab('manual')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPersona(null)
    setFormData(initialFormData)
    setGenerateFormData(initialGenerateFormData)
    setGeneratedPersona(null)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const socialUrls = [
        generateFormData.linkedin_url,
        generateFormData.twitter_url,
        generateFormData.instagram_url,
        generateFormData.facebook_url,
      ].filter(Boolean)

      const response = await fetch('/api/personas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mbti_type: generateFormData.mbti_type,
          platform: generateFormData.platform,
          social_urls: socialUrls.length > 0 ? socialUrls : undefined,
          file_content: generateFormData.file_content || undefined,
          file_name: generateFormData.file_name || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate persona')
      }

      const data = await response.json()
      setGeneratedPersona(data.generated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate persona')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveGenerated = async () => {
    if (!generatedPersona) return
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedPersona),
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
        avoid_phrases: formData.avoid_phrases.split(',').map(p => p.trim()).filter(Boolean),
        example_posts: formData.example_posts.split('---').map(p => p.trim()).filter(Boolean),
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setGenerateFormData({
        ...generateFormData,
        file_content: content,
        file_name: file.name,
      })
    }
    reader.readAsText(file)
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
                    {persona.mbti_type && (
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
                        {persona.mbti_type}
                      </span>
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
          <p className="mt-1 text-xs text-gray-500">Use MBTI + Social Profile to generate</p>
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
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

            {/* Tabs (only for new personas) */}
            {!editingPersona && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { setModalTab('ai'); setGeneratedPersona(null) }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    modalTab === 'ai'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Generate with AI
                </button>
                <button
                  onClick={() => setModalTab('manual')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    modalTab === 'manual'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Manual Entry
                </button>
              </div>
            )}

            {/* AI Generation Form */}
            {modalTab === 'ai' && !editingPersona && !generatedPersona && (
              <div className="mt-6 space-y-6">
                {/* MBTI Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300">MBTI Type</label>
                  <select
                    value={generateFormData.mbti_type}
                    onChange={(e) => setGenerateFormData({ ...generateFormData, mbti_type: e.target.value })}
                    className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {MBTI_TYPES.map((m) => (
                      <option key={m.type} value={m.type}>
                        {m.type} - {m.name} ({m.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Platform */}
                <div>
                  <label className="block text-sm font-medium text-gray-300">Target Platform</label>
                  <select
                    value={generateFormData.platform}
                    onChange={(e) => setGenerateFormData({ ...generateFormData, platform: e.target.value as 'twitter' | 'linkedin' })}
                    className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="twitter">Twitter / X</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>

                {/* Social Profile URLs */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Social Profile URLs (Optional)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="url"
                      placeholder="LinkedIn: https://linkedin.com/in/..."
                      value={generateFormData.linkedin_url}
                      onChange={(e) => setGenerateFormData({ ...generateFormData, linkedin_url: e.target.value })}
                      className="block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="url"
                      placeholder="Twitter: https://twitter.com/..."
                      value={generateFormData.twitter_url}
                      onChange={(e) => setGenerateFormData({ ...generateFormData, twitter_url: e.target.value })}
                      className="block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="url"
                      placeholder="Instagram: https://instagram.com/..."
                      value={generateFormData.instagram_url}
                      onChange={(e) => setGenerateFormData({ ...generateFormData, instagram_url: e.target.value })}
                      className="block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Or Upload Document (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer rounded-lg border-2 border-dashed border-gray-700 p-4 text-center transition-colors hover:border-purple-500/50">
                      <input
                        type="file"
                        accept=".pdf,.md,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-400">
                        {generateFormData.file_name || 'Drop PDF, MD, or TXT file'}
                      </p>
                    </label>
                    {generateFormData.file_name && (
                      <button
                        onClick={() => setGenerateFormData({ ...generateFormData, file_content: '', file_name: '' })}
                        className="rounded p-2 text-gray-400 hover:text-red-400"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating with AI...
                    </span>
                  ) : (
                    'Generate Persona with AI'
                  )}
                </button>
              </div>
            )}

            {/* Generated Persona Preview */}
            {modalTab === 'ai' && generatedPersona && (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg bg-gray-800 p-4">
                  <h3 className="text-lg font-semibold text-white">{generatedPersona.name}</h3>
                  <p className="mt-2 text-sm text-gray-300">{generatedPersona.bio}</p>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-medium text-gray-500">Tone</span>
                      <p className="text-sm text-gray-300">{generatedPersona.tone}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">Platform</span>
                      <p className="text-sm text-gray-300 capitalize">{generatedPersona.platform}</p>
                    </div>
                  </div>

                  {generatedPersona.topics && generatedPersona.topics.length > 0 && (
                    <div className="mt-4">
                      <span className="text-xs font-medium text-gray-500">Topics</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {generatedPersona.topics.map((topic) => (
                          <span
                            key={topic}
                            className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-400"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {generatedPersona.example_posts && generatedPersona.example_posts.length > 0 && (
                    <div className="mt-4">
                      <span className="text-xs font-medium text-gray-500">Example Posts</span>
                      <div className="mt-2 space-y-2">
                        {generatedPersona.example_posts.map((post, i) => (
                          <p key={i} className="rounded bg-gray-900 p-2 text-sm text-gray-300 italic">
                            "{post}"
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setGeneratedPersona(null)}
                    className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={handleSaveGenerated}
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Persona'}
                  </button>
                </div>
              </div>
            )}

            {/* Manual Entry Form */}
            {(modalTab === 'manual' || editingPersona) && (
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
                    rows={2}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Describe this persona's background..."
                    className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-300">Avoid Phrases (comma separated)</label>
                  <input
                    type="text"
                    value={formData.avoid_phrases}
                    onChange={(e) => setFormData({ ...formData, avoid_phrases: e.target.value })}
                    placeholder="e.g., game-changer, synergy"
                    className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300">Example Posts (separate with ---)</label>
                  <textarea
                    rows={4}
                    value={formData.example_posts}
                    onChange={(e) => setFormData({ ...formData, example_posts: e.target.value })}
                    placeholder="An example post...&#10;---&#10;Another example post..."
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}
