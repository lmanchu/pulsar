-- Add fields for AI-generated personas

-- Add MBTI type and generation source to personas
ALTER TABLE public.personas
ADD COLUMN IF NOT EXISTS mbti_type TEXT CHECK (mbti_type IN (
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
)),
ADD COLUMN IF NOT EXISTS generation_source JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS writing_style JSONB DEFAULT '{}';

-- generation_source structure:
-- {
--   "type": "mbti" | "social_profile" | "file_upload",
--   "mbti": "INTJ",
--   "social_urls": ["https://linkedin.com/in/...", "https://twitter.com/..."],
--   "file_name": "my-profile.pdf",
--   "generated_at": "2024-01-01T00:00:00Z"
-- }

-- writing_style structure:
-- {
--   "opening_patterns": ["觀察下來...", "有個有趣的現象..."],
--   "emphasis_patterns": ["說穿了就是...", "關鍵在於..."],
--   "closing_patterns": ["值得深思。", "拭目以待。"]
-- }

COMMENT ON COLUMN public.personas.mbti_type IS 'MBTI personality type used as base for persona generation';
COMMENT ON COLUMN public.personas.generation_source IS 'Source data used to generate this persona (MBTI, social URLs, uploaded file)';
COMMENT ON COLUMN public.personas.writing_style IS 'AI-extracted writing style patterns';
