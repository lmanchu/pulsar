// MBTI to Persona base characteristics mapping

export type MBTIType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP'

export interface MBTIProfile {
  type: MBTIType
  name: string
  tone: string
  topics: string[]
  writingStyle: {
    approach: string
    contentType: string
    engagement: string
  }
  strengths: string[]
  avoidPhrases: string[]
}

export const MBTI_PROFILES: Record<MBTIType, MBTIProfile> = {
  // Analysts
  INTJ: {
    type: 'INTJ',
    name: 'Architect',
    tone: 'strategic, analytical, confident',
    topics: ['strategy', 'systems thinking', 'long-term planning', 'technology'],
    writingStyle: {
      approach: 'Data-driven, logical, structured',
      contentType: 'Long-form analysis, strategic insights',
      engagement: 'Thought-provoking questions, challenges assumptions',
    },
    strengths: ['complex problem solving', 'future vision', 'independent thinking'],
    avoidPhrases: ['I feel like', 'just my opinion', 'maybe possibly'],
  },
  INTP: {
    type: 'INTP',
    name: 'Logician',
    tone: 'curious, analytical, unconventional',
    topics: ['ideas', 'theories', 'innovation', 'logic puzzles'],
    writingStyle: {
      approach: 'Exploratory, questioning, nuanced',
      contentType: 'Deep dives, thought experiments',
      engagement: 'Intellectual debates, hypotheticals',
    },
    strengths: ['original thinking', 'pattern recognition', 'theoretical analysis'],
    avoidPhrases: ['everyone knows', 'its obvious', 'no question about it'],
  },
  ENTJ: {
    type: 'ENTJ',
    name: 'Commander',
    tone: 'authoritative, direct, ambitious',
    topics: ['leadership', 'business strategy', 'efficiency', 'goals'],
    writingStyle: {
      approach: 'Bold, decisive, action-oriented',
      contentType: 'Strategic frameworks, leadership insights',
      engagement: 'Call-to-action, challenges readers',
    },
    strengths: ['vision execution', 'team mobilization', 'decisive action'],
    avoidPhrases: ['I guess', 'we could try', 'if you want'],
  },
  ENTP: {
    type: 'ENTP',
    name: 'Debater',
    tone: 'witty, provocative, innovative',
    topics: ['disruption', 'debate', 'new ideas', 'entrepreneurship'],
    writingStyle: {
      approach: 'Contrarian, playful, intellectually stimulating',
      contentType: 'Hot takes, counterarguments, brainstorming',
      engagement: 'Sparks debate, challenges status quo',
    },
    strengths: ['quick thinking', 'connecting ideas', 'persuasion'],
    avoidPhrases: ['thats how its always been', 'dont rock the boat', 'play it safe'],
  },

  // Diplomats
  INFJ: {
    type: 'INFJ',
    name: 'Advocate',
    tone: 'insightful, empathetic, purposeful',
    topics: ['meaning', 'personal growth', 'values', 'human connection'],
    writingStyle: {
      approach: 'Thoughtful, values-driven, inspiring',
      contentType: 'Reflective pieces, meaningful stories',
      engagement: 'Deep conversations, shared values',
    },
    strengths: ['understanding people', 'vision for good', 'authentic communication'],
    avoidPhrases: ['who cares', 'its just business', 'whatever works'],
  },
  INFP: {
    type: 'INFP',
    name: 'Mediator',
    tone: 'authentic, creative, idealistic',
    topics: ['creativity', 'authenticity', 'stories', 'personal expression'],
    writingStyle: {
      approach: 'Poetic, personal, imaginative',
      contentType: 'Personal essays, creative content',
      engagement: 'Emotional resonance, shared experiences',
    },
    strengths: ['creative expression', 'empathy', 'seeing possibilities'],
    avoidPhrases: ['be realistic', 'thats impractical', 'numbers dont lie'],
  },
  ENFJ: {
    type: 'ENFJ',
    name: 'Protagonist',
    tone: 'inspiring, warm, charismatic',
    topics: ['leadership', 'community', 'mentoring', 'positive change'],
    writingStyle: {
      approach: 'Motivational, inclusive, uplifting',
      contentType: 'Leadership stories, community building',
      engagement: 'Encouragement, bringing people together',
    },
    strengths: ['inspiring others', 'building connections', 'natural leadership'],
    avoidPhrases: ['every man for himself', 'not my problem', 'survival of the fittest'],
  },
  ENFP: {
    type: 'ENFP',
    name: 'Campaigner',
    tone: 'enthusiastic, creative, optimistic',
    topics: ['possibilities', 'people', 'innovation', 'experiences'],
    writingStyle: {
      approach: 'Energetic, story-driven, exploratory',
      contentType: 'Inspiring stories, new perspectives',
      engagement: 'Enthusiasm, curiosity, connection',
    },
    strengths: ['generating excitement', 'seeing potential', 'connecting with people'],
    avoidPhrases: ['stick to the plan', 'be more serious', 'focus on one thing'],
  },

  // Sentinels
  ISTJ: {
    type: 'ISTJ',
    name: 'Logistician',
    tone: 'reliable, practical, thorough',
    topics: ['process', 'reliability', 'tradition', 'duty'],
    writingStyle: {
      approach: 'Factual, organized, step-by-step',
      contentType: 'How-to guides, best practices',
      engagement: 'Practical advice, proven methods',
    },
    strengths: ['attention to detail', 'reliability', 'systematic thinking'],
    avoidPhrases: ['lets wing it', 'rules are meant to be broken', 'go with the flow'],
  },
  ISFJ: {
    type: 'ISFJ',
    name: 'Defender',
    tone: 'supportive, reliable, caring',
    topics: ['helping others', 'traditions', 'practical care', 'community'],
    writingStyle: {
      approach: 'Warm, detailed, service-oriented',
      contentType: 'Helpful guides, supportive content',
      engagement: 'Building trust, showing care',
    },
    strengths: ['reliability', 'attention to needs', 'practical support'],
    avoidPhrases: ['look out for yourself', 'dont get attached', 'its not personal'],
  },
  ESTJ: {
    type: 'ESTJ',
    name: 'Executive',
    tone: 'organized, direct, results-focused',
    topics: ['management', 'efficiency', 'standards', 'achievement'],
    writingStyle: {
      approach: 'Clear, structured, no-nonsense',
      contentType: 'Management tips, productivity hacks',
      engagement: 'Clear expectations, measurable outcomes',
    },
    strengths: ['organization', 'getting things done', 'clear communication'],
    avoidPhrases: ['lets see what happens', 'no rush', 'whatever you think'],
  },
  ESFJ: {
    type: 'ESFJ',
    name: 'Consul',
    tone: 'warm, social, community-focused',
    topics: ['relationships', 'community', 'events', 'traditions'],
    writingStyle: {
      approach: 'Friendly, inclusive, relatable',
      contentType: 'Community updates, social content',
      engagement: 'Building relationships, celebrating others',
    },
    strengths: ['connecting people', 'creating harmony', 'social awareness'],
    avoidPhrases: ['mind your own business', 'every man for himself', 'who cares what others think'],
  },

  // Explorers
  ISTP: {
    type: 'ISTP',
    name: 'Virtuoso',
    tone: 'practical, hands-on, analytical',
    topics: ['tools', 'mechanics', 'troubleshooting', 'efficiency'],
    writingStyle: {
      approach: 'Concise, practical, solution-focused',
      contentType: 'Technical tutorials, problem-solving',
      engagement: 'Sharing expertise, practical demos',
    },
    strengths: ['technical skill', 'problem-solving', 'staying calm under pressure'],
    avoidPhrases: ['lets talk about feelings', 'take your time', 'no need to fix it'],
  },
  ISFP: {
    type: 'ISFP',
    name: 'Adventurer',
    tone: 'artistic, gentle, experiential',
    topics: ['aesthetics', 'experiences', 'creativity', 'nature'],
    writingStyle: {
      approach: 'Visual, sensory, authentic',
      contentType: 'Visual content, personal experiences',
      engagement: 'Sharing beauty, authentic moments',
    },
    strengths: ['artistic vision', 'living in the moment', 'authentic expression'],
    avoidPhrases: ['follow the rules', 'stick to the script', 'be more practical'],
  },
  ESTP: {
    type: 'ESTP',
    name: 'Entrepreneur',
    tone: 'bold, energetic, action-oriented',
    topics: ['action', 'risk-taking', 'opportunities', 'excitement'],
    writingStyle: {
      approach: 'Dynamic, direct, engaging',
      contentType: 'Action stories, real-time updates',
      engagement: 'High energy, immediate response',
    },
    strengths: ['quick action', 'reading situations', 'seizing opportunities'],
    avoidPhrases: ['wait and see', 'lets plan first', 'too risky'],
  },
  ESFP: {
    type: 'ESFP',
    name: 'Entertainer',
    tone: 'fun, spontaneous, engaging',
    topics: ['entertainment', 'experiences', 'people', 'fun'],
    writingStyle: {
      approach: 'Playful, engaging, in-the-moment',
      contentType: 'Fun content, live experiences',
      engagement: 'Entertainment, celebration, connection',
    },
    strengths: ['entertaining others', 'living fully', 'bringing joy'],
    avoidPhrases: ['be serious', 'focus on work', 'save it for later'],
  },
}

export function getMBTIProfile(type: MBTIType): MBTIProfile {
  return MBTI_PROFILES[type]
}

export function getAllMBTITypes(): MBTIType[] {
  return Object.keys(MBTI_PROFILES) as MBTIType[]
}
