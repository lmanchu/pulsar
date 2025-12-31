import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { getMBTIProfile, MBTIType } from '../../../../lib/mbti-mapping'
import OpenAI from 'openai'

interface SocialProfile {
  platform: string
  url: string
  bio?: string
  headline?: string
  content?: string
  error?: string
}

interface GenerateRequest {
  mbti_type: MBTIType
  platform: 'twitter' | 'linkedin'
  social_urls?: string[]
  file_content?: string
  file_name?: string
}

interface GeneratedPersona {
  name: string
  bio: string
  tone: string
  topics: string[]
  avoid_phrases: string[]
  example_posts: string[]
  writing_style: {
    opening_patterns: string[]
    emphasis_patterns: string[]
    closing_patterns: string[]
  }
}

// Fetch public profile data from social URLs
async function fetchSocialProfile(url: string): Promise<SocialProfile> {
  const platform = detectPlatform(url)

  try {
    // Use a simple fetch to get the page HTML
    // In production, you'd use a proper scraping service or API
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      return { platform, url, error: `Failed to fetch: ${response.status}` }
    }

    const html = await response.text()

    // Extract basic info from meta tags
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    const ogDescriptionMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)

    return {
      platform,
      url,
      headline: titleMatch?.[1]?.trim(),
      bio: descriptionMatch?.[1] || ogDescriptionMatch?.[1],
    }
  } catch (error) {
    return {
      platform,
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function detectPlatform(url: string): string {
  if (url.includes('linkedin.com')) return 'linkedin'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('facebook.com')) return 'facebook'
  return 'unknown'
}

// Generate persona using AI
async function generatePersonaWithAI(
  mbtiProfile: ReturnType<typeof getMBTIProfile>,
  platform: 'twitter' | 'linkedin',
  socialProfiles: SocialProfile[],
  fileContent?: string
): Promise<GeneratedPersona> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const socialContext = socialProfiles
    .filter(p => !p.error)
    .map(p => `${p.platform}: ${p.headline || ''} - ${p.bio || ''}`)
    .join('\n')

  const prompt = `You are an expert at creating social media personas. Generate a detailed content persona based on the following inputs.

MBTI Type: ${mbtiProfile.type} (${mbtiProfile.name})
MBTI Characteristics:
- Tone: ${mbtiProfile.tone}
- Typical topics: ${mbtiProfile.topics.join(', ')}
- Writing approach: ${mbtiProfile.writingStyle.approach}
- Content type: ${mbtiProfile.writingStyle.contentType}
- Engagement style: ${mbtiProfile.writingStyle.engagement}

Target Platform: ${platform}

${socialContext ? `Social Profile Info:\n${socialContext}\n` : ''}
${fileContent ? `Additional Context from uploaded document:\n${fileContent.slice(0, 3000)}\n` : ''}

Generate a persona for ${platform} content creation. Return a JSON object with:
{
  "name": "A descriptive name for this persona (e.g., 'Tech Strategist', 'Growth Mentor')",
  "bio": "A 1-2 sentence bio describing this persona's expertise and perspective",
  "tone": "The writing tone (e.g., 'strategic, analytical, with occasional wit')",
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "avoid_phrases": ["phrase1", "phrase2", "phrase3"],
  "example_posts": [
    "An example ${platform} post in this persona's voice about their expertise",
    "Another example post showing their unique perspective"
  ],
  "writing_style": {
    "opening_patterns": ["How they typically start posts", "Another opening pattern"],
    "emphasis_patterns": ["How they emphasize key points"],
    "closing_patterns": ["How they typically end posts"]
  }
}

${platform === 'twitter' ? 'Keep example posts under 280 characters.' : 'LinkedIn posts can be longer, 100-300 words.'}

Respond with ONLY the JSON object, no other text.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from AI')
  }

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Invalid AI response format')
  }

  return JSON.parse(jsonMatch[0]) as GeneratedPersona
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateRequest = await request.json()
    const { mbti_type, platform, social_urls, file_content, file_name } = body

    // Validate required fields
    if (!mbti_type || !platform) {
      return NextResponse.json(
        { error: 'MBTI type and platform are required' },
        { status: 400 }
      )
    }

    // Get MBTI profile
    const mbtiProfile = getMBTIProfile(mbti_type)
    if (!mbtiProfile) {
      return NextResponse.json(
        { error: 'Invalid MBTI type' },
        { status: 400 }
      )
    }

    // Fetch social profiles if URLs provided
    const socialProfiles: SocialProfile[] = []
    if (social_urls && social_urls.length > 0) {
      const fetchPromises = social_urls
        .filter(url => url && url.trim())
        .map(url => fetchSocialProfile(url.trim()))

      const results = await Promise.all(fetchPromises)
      socialProfiles.push(...results)
    }

    // Generate persona using AI
    const generatedPersona = await generatePersonaWithAI(
      mbtiProfile,
      platform,
      socialProfiles,
      file_content
    )

    // Prepare generation source metadata
    const generationSource = {
      type: file_content ? 'file_upload' : social_urls?.length ? 'social_profile' : 'mbti',
      mbti: mbti_type,
      social_urls: social_urls?.filter(u => u && u.trim()) || [],
      file_name: file_name || null,
      generated_at: new Date().toISOString(),
    }

    // Return the generated persona (not saved yet - user can review and save)
    return NextResponse.json({
      generated: {
        ...generatedPersona,
        platform,
        mbti_type,
        generation_source: generationSource,
        is_active: true,
      },
      social_profiles: socialProfiles,
    })

  } catch (error) {
    console.error('Error generating persona:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate persona' },
      { status: 500 }
    )
  }
}
