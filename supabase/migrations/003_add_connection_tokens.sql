-- Create connection_tokens table for browser extension authentication
-- These are short-lived tokens that allow the extension to connect accounts

CREATE TABLE IF NOT EXISTS connection_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_connection_tokens_token ON connection_tokens(token);

-- Index for user lookups (to delete old tokens)
CREATE INDEX IF NOT EXISTS idx_connection_tokens_user_id ON connection_tokens(user_id);

-- RLS policies
ALTER TABLE connection_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tokens
CREATE POLICY "Users can view own tokens" ON connection_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own tokens
CREATE POLICY "Users can create own tokens" ON connection_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete own tokens" ON connection_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE connection_tokens IS 'Short-lived tokens for browser extension to connect social accounts';
