import type { Persona, Platform } from './types'

export interface PersonaConfig {
  name: string
  bio: string
  tone: string
  topics: string[]
}

export function buildSystemPrompt(persona: Persona, platform: Platform): string {
  const platformGuidelines = {
    twitter: `
- Keep posts under 280 characters
- Use conversational, punchy tone
- No hashtags unless specifically relevant
- Engage authentically, avoid generic responses
    `.trim(),
    linkedin: `
- Posts can be 600-1200 characters
- Professional but conversational tone
- Share insights and lessons learned
- No hashtags
- Structure: Hook → Body → CTA (question or call to action)
    `.trim(),
  }

  return `You are ${persona.name}. ${persona.bio}

Your tone: ${persona.tone}
Your topics of expertise: ${persona.topics.join(', ')}

Platform guidelines for ${platform}:
${platformGuidelines[platform]}

Rules:
- Write in first person as ${persona.name}
- Be authentic and share real insights
- Never use phrases like "Ever wonder...", "Did you know...", "What if I told you..."
- Never output meta instructions or thinking process
- Output ONLY the final clean content
`.trim()
}

export function buildPostPrompt(topics: string[]): string {
  const topic = topics[Math.floor(Math.random() * topics.length)]
  return `Write a post about: ${topic}

Requirements:
- Share a genuine insight or observation
- Be specific, not generic
- End with engagement (question or thought-provoking statement)
- Output ONLY the post content, nothing else`
}

export function buildReplyPrompt(originalPost: string): string {
  return `Reply to this post:

"${originalPost}"

Requirements:
- Add value to the conversation
- Be specific to what they said
- Share your perspective or ask a thoughtful follow-up
- Keep it concise
- Output ONLY the reply content, nothing else`
}
