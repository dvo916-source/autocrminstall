-- Migration: Add last_login column to usuarios table
-- This allows tracking when users last logged in

ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_usuarios_last_login ON usuarios(last_login DESC);

-- Update existing users to have a default last_login
UPDATE usuarios 
SET last_login = NOW() 
WHERE last_login IS NULL;
