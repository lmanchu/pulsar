-- Add session-based authentication support to social_accounts
-- This allows users to connect via browser session (capturing cookies) instead of credentials

-- Add new columns for session-based auth
ALTER TABLE social_accounts
ADD COLUMN IF NOT EXISTS encrypted_cookies JSONB,
ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'credentials' CHECK (auth_method IN ('credentials', 'session')),
ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN social_accounts.encrypted_cookies IS 'Encrypted browser session cookies for session-based auth';
COMMENT ON COLUMN social_accounts.auth_method IS 'Authentication method: credentials (username/password) or session (browser cookies)';
COMMENT ON COLUMN social_accounts.session_expires_at IS 'When the session cookies are expected to expire';

-- Create index for faster lookups by auth method
CREATE INDEX IF NOT EXISTS idx_social_accounts_auth_method ON social_accounts(auth_method);
