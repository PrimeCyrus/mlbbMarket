-- =============================================================================
-- Migration: Add seller_applications table
-- Run this in your Supabase SQL Editor (safe to run on existing database)
-- =============================================================================

-- Table
CREATE TABLE IF NOT EXISTS seller_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(uid) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  note TEXT,
  government_id_url TEXT NOT NULL,
  passport_photo_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT REFERENCES users(uid),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications" ON seller_applications FOR SELECT
  USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can view all applications" ON seller_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role = 'admin'));
CREATE POLICY "Authenticated users can submit applications" ON seller_applications FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Admins can update applications" ON seller_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role = 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE seller_applications;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seller_applications_user ON seller_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_status ON seller_applications(status);
