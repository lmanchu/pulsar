-- News Pipeline Schema
-- RSS-based content discovery and curation

-- ============================================
-- NEWS FEEDS (RSS sources to monitor)
-- ============================================
CREATE TABLE public.news_feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  url TEXT NOT NULL,

  -- Categorization
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),

  -- Status
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  fetch_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, url)
);

-- ============================================
-- NEWS ARTICLES (discovered content)
-- ============================================
CREATE TABLE public.news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feed_id UUID REFERENCES public.news_feeds(id) ON DELETE SET NULL,

  -- Article metadata
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT,
  summary TEXT,
  published_at TIMESTAMPTZ,

  -- AI scoring
  score INTEGER CHECK (score >= 0 AND score <= 10),
  is_highlight BOOLEAN DEFAULT false,
  ai_reason TEXT,
  suggested_angle TEXT,

  -- Generated content
  draft_content TEXT,
  final_content TEXT,

  -- Workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  platforms TEXT[] DEFAULT '{twitter}',
  scheduled_at TIMESTAMPTZ,

  -- Persona for content generation
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,

  -- After publishing
  content_job_id UUID REFERENCES public.content_jobs(id) ON DELETE SET NULL,
  published_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, url)
);

-- ============================================
-- NEWS KEYWORDS (for AI scoring)
-- ============================================
CREATE TABLE public.news_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  keyword TEXT NOT NULL,
  weight TEXT DEFAULT 'medium' CHECK (weight IN ('high', 'medium', 'low')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, keyword)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_news_articles_user_status ON public.news_articles(user_id, status);
CREATE INDEX idx_news_articles_user_score ON public.news_articles(user_id, score DESC);
CREATE INDEX idx_news_articles_scheduled ON public.news_articles(user_id, scheduled_at) WHERE status = 'approved';
CREATE INDEX idx_news_feeds_user_enabled ON public.news_feeds(user_id, is_enabled);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.news_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_keywords ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own feeds" ON public.news_feeds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own feeds" ON public.news_feeds
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own articles" ON public.news_articles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own articles" ON public.news_articles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own keywords" ON public.news_keywords
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own keywords" ON public.news_keywords
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to approve article and create content job
CREATE OR REPLACE FUNCTION approve_news_article(
  p_article_id UUID,
  p_persona_id UUID,
  p_platforms TEXT[],
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_final_content TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_article news_articles%ROWTYPE;
  v_job_id UUID;
  v_platform TEXT;
BEGIN
  -- Get article
  SELECT * INTO v_article FROM news_articles WHERE id = p_article_id;

  IF v_article.id IS NULL THEN
    RAISE EXCEPTION 'Article not found';
  END IF;

  -- Create content job for first platform
  v_platform := p_platforms[1];

  INSERT INTO content_jobs (
    user_id,
    persona_id,
    platform,
    job_type,
    generated_content,
    status,
    scheduled_at
  ) VALUES (
    v_article.user_id,
    p_persona_id,
    v_platform,
    'post',
    COALESCE(p_final_content, v_article.draft_content),
    'pending',
    p_scheduled_at
  ) RETURNING id INTO v_job_id;

  -- Update article
  UPDATE news_articles SET
    status = 'approved',
    persona_id = p_persona_id,
    platforms = p_platforms,
    scheduled_at = p_scheduled_at,
    final_content = COALESCE(p_final_content, draft_content),
    content_job_id = v_job_id,
    updated_at = NOW()
  WHERE id = p_article_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
