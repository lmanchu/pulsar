-- Migration: Add threads platform support
-- This migration updates all platform check constraints to include 'threads'

-- 1. Drop and recreate constraint on social_accounts
ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;
ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN ('twitter', 'linkedin', 'threads'));

-- 2. Drop and recreate constraint on content_jobs
ALTER TABLE content_jobs DROP CONSTRAINT IF EXISTS content_jobs_platform_check;
ALTER TABLE content_jobs ADD CONSTRAINT content_jobs_platform_check
  CHECK (platform IN ('twitter', 'linkedin', 'threads'));

-- 3. Drop and recreate constraint on posted_content
ALTER TABLE posted_content DROP CONSTRAINT IF EXISTS posted_content_platform_check;
ALTER TABLE posted_content ADD CONSTRAINT posted_content_platform_check
  CHECK (platform IN ('twitter', 'linkedin', 'threads'));

-- 4. Drop and recreate constraint on tracked_accounts
ALTER TABLE tracked_accounts DROP CONSTRAINT IF EXISTS tracked_accounts_platform_check;
ALTER TABLE tracked_accounts ADD CONSTRAINT tracked_accounts_platform_check
  CHECK (platform IN ('twitter', 'linkedin', 'threads'));

-- 5. Drop and recreate constraint on personas
ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_platform_check;
ALTER TABLE personas ADD CONSTRAINT personas_platform_check
  CHECK (platform IN ('twitter', 'linkedin', 'threads'));
