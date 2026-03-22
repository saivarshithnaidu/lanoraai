-- Lanora AI Social Schema v2
-- Run this in Supabase SQL Editor to enable Instagram-style features

-- 1. Extend Profiles Table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;

-- 2. Follows Table
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- 3. Chat Conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_group BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Chat Participants
CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- 5. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_seen BOOLEAN DEFAULT FALSE,
    seen_at TIMESTAMP WITH TIME ZONE
);

-- 6. RPC: Get Conversation by Participants
DROP FUNCTION IF EXISTS get_conversation_by_participants(p_user_ids UUID[]);
CREATE OR REPLACE FUNCTION get_conversation_by_participants(p_user_ids UUID[])
RETURNS TABLE(conversation_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT cp.conversation_id
    FROM chat_participants cp
    WHERE cp.user_id = ANY(p_user_ids)
    GROUP BY cp.conversation_id
    HAVING COUNT(DISTINCT cp.user_id) = ARRAY_LENGTH(p_user_ids, 1)
    AND NOT EXISTS (
        SELECT 1 
        FROM chat_participants cp2 
        WHERE cp2.conversation_id = cp.conversation_id 
        AND cp2.user_id != ALL(p_user_ids)
    );
END;
$$ LANGUAGE plpgsql;

-- 7. RLS Policies
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for authenticated users (Manual Auth uses service role usually, but these helps if using client)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can follow anyone" ON follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can see their own follows" ON follows FOR SELECT USING (follower_id = auth.uid() OR following_id = auth.uid());
CREATE POLICY "Users can see their own messages" ON chat_messages FOR SELECT USING (true);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
