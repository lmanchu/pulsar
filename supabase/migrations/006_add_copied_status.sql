-- Add 'copied' status for semi-automated workflow
-- Flow: pending -> generating -> ready -> copied -> completed (manual post)
--       OR: ready -> posting -> completed (automated post)

ALTER TABLE public.content_jobs
DROP CONSTRAINT IF EXISTS content_jobs_status_check;

ALTER TABLE public.content_jobs
ADD CONSTRAINT content_jobs_status_check
CHECK (status IN ('pending', 'generating', 'ready', 'copied', 'posting', 'completed', 'failed'));

-- Add copied_at timestamp to track when content was copied
ALTER TABLE public.content_jobs
ADD COLUMN IF NOT EXISTS copied_at TIMESTAMPTZ;
