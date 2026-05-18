CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  full_name TEXT,
  photo_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'seller', 'admin')),
  seller_status TEXT DEFAULT 'not_applied' CHECK (seller_status IN ('not_applied', 'pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Listings Table
-- Stores MLBB account listings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  user_id TEXT REFERENCES users(uid),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sold_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- Reviews Table
-- Stores seller reviews from buyers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT REFERENCES users(uid),
  reviewer_id TEXT REFERENCES users(uid),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Conversations Table
-- Stores chat conversations between buyers and sellers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  "listingId" TEXT NOT NULL,
  "sellerId" TEXT REFERENCES users(uid),
  "buyerId" TEXT REFERENCES users(uid),
  "buyerName" TEXT,
  "lastMessage" TEXT,
  "lastSenderId" TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "buyerLastReadAt" TIMESTAMPTZ,
  "sellerLastReadAt" TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- Messages Table
-- Stores individual chat messages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  "senderId" TEXT REFERENCES users(uid),
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Wishlist Table
-- Stores user wishlisted items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(uid),
  listing_id TEXT NOT NULL,
  title TEXT,
  price NUMERIC,
  image_url TEXT,
  seller_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- =============================================================================
-- Enable Row Level Security on all tables
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS Policies for Users
-- =============================================================================
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = uid);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = uid);

-- =============================================================================
-- RLS Policies for Listings
-- =============================================================================
CREATE POLICY "Listings are viewable by everyone" ON listings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create listings" ON listings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own listings" ON listings FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own listings" ON listings FOR DELETE USING (auth.uid()::text = user_id);

-- =============================================================================
-- RLS Policies for Reviews
-- =============================================================================
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid()::text = reviewer_id);

-- =============================================================================
-- RLS Policies for Conversations
-- =============================================================================
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT 
  USING (auth.uid()::text = "buyerId" OR auth.uid()::text = "sellerId");
CREATE POLICY "Authenticated users can create conversations" ON conversations FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE 
  USING (auth.uid()::text = "buyerId" OR auth.uid()::text = "sellerId");

-- =============================================================================
-- RLS Policies for Messages
-- =============================================================================
CREATE POLICY "Users can view messages in own conversations" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id 
    AND (c."buyerId" = auth.uid()::text OR c."sellerId" = auth.uid()::text)
  )
);
CREATE POLICY "Authenticated users can create messages" ON messages FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- RLS Policies for Wishlist
-- =============================================================================
CREATE POLICY "Users can view own wishlist" ON wishlist FOR SELECT 
  USING (auth.uid()::text = user_id);
CREATE POLICY "Users can manage own wishlist" ON wishlist FOR ALL 
  USING (auth.uid()::text = user_id);

-- =============================================================================
-- Enable Realtime for all tables
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE listings;
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE wishlist;

-- =============================================================================
-- Create indexes for better query performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations("buyerId");
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations("sellerId");
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
