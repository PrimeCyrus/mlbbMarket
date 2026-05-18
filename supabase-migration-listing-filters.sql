-- =============================================================================
-- Migration: Change collector_level to TEXT
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- If you haven't run the previous script yet, run this to create the columns:
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_girls_id BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS collector_level TEXT;

-- If you ALREADY ran the previous script, run this line instead to change the type to TEXT:
ALTER TABLE listings ALTER COLUMN collector_level TYPE TEXT USING collector_level::TEXT;
