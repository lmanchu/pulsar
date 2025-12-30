'use client'

import { useState } from 'react'

interface Persona {
  id: string
  name: string
  bio: string
  tone: string
  topics: string[]
  platform: 'twitter' | 'linkedin'
  isActive: boolean
}

const mockPersonas: Persona[] = [
  {
    id: '1',
    name: 'Tech Founder',
    bio: 'Building startups and sharing lessons learned along the way.',
    tone: 'professional',
    topics: ['startups', 'AI', 'product development'],
    platform: 'twitter',
    isActive: true,
  },
  {
    id: '2',
    name: 'Growth Expert',
    bio: 'Helping companies scale through data-driven strategies.',
    tone: 'conversational',
    topics: ['growth', 'marketing', 'analytics'],
    platform: 'linkedin',
    isActive: true,
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

export default function PersonasPage() {
  const [personas] = useState<Persona[]>(mockPersonas)
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Personas</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your AI content generation personas
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
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
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    persona.isActive
                      ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20'
                      : 'bg-gray-500/10 text-gray-400 ring-1 ring-gray-500/20'
                  }`}
                >
                  {persona.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-300">{persona.bio}</p>

            <div className="mt-4">
              <span className="text-xs font-medium text-gray-500">Tone</span>
              <p className="mt-1 text-sm text-gray-300 capitalize">{persona.tone}</p>
            </div>

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

            <div className="mt-6 flex items-center gap-3 border-t border-gray-800 pt-4">
              <button className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700">
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
          onClick={() => setIsModalOpen(true)}
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

      {/* Modal placeholder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-gray-900 p-6 ring-1 ring-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Create New Persona</h2>
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
                <label className="block text-sm font-medium text-gray-300">Name</label>
                <input
                  type="text"
                  placeholder="e.g., Tech Founder"
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Bio</label>
                <textarea
                  rows={3}
                  placeholder="Describe this persona's background and expertise..."
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Platform</label>
                <select className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="twitter">Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Tone</label>
                <select className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
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
                  placeholder="e.g., startups, AI, product"
                  className="mt-1 block w-full rounded-lg bg-gray-800 px-4 py-2 text-white placeholder-gray-500 ring-1 ring-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
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
                  Create Persona
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
