-- Pulsar Database Schema
-- Social Media Automation SaaS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (extends Supabase Auth)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,

  -- Subscription
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'agency')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled')),

  -- Limits based on plan
  max_platforms INTEGER NOT NULL DEFAULT 0,
  max_posts_per_day INTEGER NOT NULL DEFAULT 0,
  max_replies_per_day INTEGER NOT NULL DEFAULT 0,
  max_tracked_accounts INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SOCIAL ACCOUNTS (connected Twitter/LinkedIn)
-- ============================================
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin')),
  platform_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,

  -- Encrypted credentials (for browser automation)
  encrypted_credentials JSONB,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, platform, platform_user_id)
);

-- ============================================
-- PERSONAS (content generation profiles)
-- ============================================
CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  bio TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'professional',
  topics TEXT[] NOT NULL DEFAULT '{}',

  -- Platform-specific settings
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin')),

  -- Content guidelines
  avoid_phrases TEXT[] DEFAULT '{}',
  example_posts TEXT[] DEFAULT '{}',

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TRACKED ACCOUNTS (accounts to engage with)
-- ============================================
CREATE TABLE public.tracked_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin')),
  handle TEXT NOT NULL,
  display_name TEXT,
  profile_url TEXT,

  -- Categorization
  category TEXT,
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),

  -- Status
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_engaged_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, platform, handle)
);

-- ============================================
-- CONTENT JOBS (scheduled posts/replies)
-- ============================================
CREATE TABLE public.content_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,

  -- Job type
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin')),
  job_type TEXT NOT NULL CHECK (job_type IN ('post', 'reply')),

  -- For replies
  target_url TEXT,
  target_content TEXT,
  tracked_account_id UUID REFERENCES public.tracked_accounts(id) ON DELETE SET NULL,

  -- Content
  generated_content TEXT,
  final_content TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'posting', 'completed', 'failed')),
  error_message TEXT,

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  post_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DAILY STATS (usage tracking)
-- ============================================
CREATE TABLE public.daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Twitter stats
  twitter_posts INTEGER NOT NULL DEFAULT 0,
  twitter_replies INTEGER NOT NULL DEFAULT 0,

  -- LinkedIn stats
  linkedin_posts INTEGER NOT NULL DEFAULT 0,
  linkedin_replies INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, date)
);

-- ============================================
-- SCHEDULE CONFIG (posting schedule)
-- ============================================
CREATE TABLE public.schedule_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'linkedin')),

  -- Schedule settings
  posts_per_day INTEGER NOT NULL DEFAULT 3,
  replies_per_day INTEGER NOT NULL DEFAULT 6,
  timezone TEXT NOT NULL DEFAULT 'Asia/Taipei',

  -- Active hours (0-23)
  active_hours_start INTEGER NOT NULL DEFAULT 9 CHECK (active_hours_start BETWEEN 0 AND 23),
  active_hours_end INTEGER NOT NULL DEFAULT 21 CHECK (active_hours_end BETWEEN 0 AND 23),

  -- Days of week (0=Sunday, 6=Saturday)
  active_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',

  -- Status
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, platform)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_social_accounts_user_id ON public.social_accounts(user_id);
CREATE INDEX idx_personas_user_id ON public.personas(user_id);
CREATE INDEX idx_tracked_accounts_user_id ON public.tracked_accounts(user_id);
CREATE INDEX idx_content_jobs_user_id ON public.content_jobs(user_id);
CREATE INDEX idx_content_jobs_status ON public.content_jobs(status);
CREATE INDEX idx_content_jobs_scheduled_at ON public.content_jobs(scheduled_at);
CREATE INDEX idx_daily_stats_user_date ON public.daily_stats(user_id, date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_configs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own social accounts" ON public.social_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own personas" ON public.personas
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tracked accounts" ON public.tracked_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own content jobs" ON public.content_jobs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily stats" ON public.daily_stats
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own schedule configs" ON public.schedule_configs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment daily stats
CREATE OR REPLACE FUNCTION public.increment_daily_stat(
  p_user_id UUID,
  p_date DATE,
  p_platform TEXT,
  p_type TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.daily_stats (user_id, date)
  VALUES (p_user_id, p_date)
  ON CONFLICT (user_id, date) DO NOTHING;

  IF p_platform = 'twitter' AND p_type = 'posts' THEN
    UPDATE public.daily_stats
    SET twitter_posts = twitter_posts + 1, updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_date;
  ELSIF p_platform = 'twitter' AND p_type = 'replies' THEN
    UPDATE public.daily_stats
    SET twitter_replies = twitter_replies + 1, updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_date;
  ELSIF p_platform = 'linkedin' AND p_type = 'posts' THEN
    UPDATE public.daily_stats
    SET linkedin_posts = linkedin_posts + 1, updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_date;
  ELSIF p_platform = 'linkedin' AND p_type = 'replies' THEN
    UPDATE public.daily_stats
    SET linkedin_replies = linkedin_replies + 1, updated_at = NOW()
    WHERE user_id = p_user_id AND date = p_date;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tracked_accounts_updated_at
  BEFORE UPDATE ON public.tracked_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_content_jobs_updated_at
  BEFORE UPDATE ON public.content_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_daily_stats_updated_at
  BEFORE UPDATE ON public.daily_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_schedule_configs_updated_at
  BEFORE UPDATE ON public.schedule_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- SEED DATA FOR PLAN LIMITS
-- ============================================
COMMENT ON TABLE public.users IS 'Plan limits:
- free: 0 platforms, 0 posts/day, 0 replies/day
- starter ($29): 1 platform, 3 posts/day, 5 replies/day, 10 tracked accounts
- pro ($79): 2 platforms, 10 posts/day, 20 replies/day, 50 tracked accounts
- agency ($199): 5 platforms (accounts), 20 posts/day, 50 replies/day, 200 tracked accounts';
