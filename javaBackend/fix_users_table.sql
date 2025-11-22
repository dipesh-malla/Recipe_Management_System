-- Remove inappropriate columns from users table
-- These columns either belong in user_stats or are ML-specific and should not be in the main users table

ALTER TABLE users DROP COLUMN IF EXISTS preferences;
ALTER TABLE users DROP COLUMN IF EXISTS user_type;
ALTER TABLE users DROP COLUMN IF EXISTS followers_count;
ALTER TABLE users DROP COLUMN IF EXISTS following_count;
ALTER TABLE users DROP COLUMN IF EXISTS recipes_count;
ALTER TABLE users DROP COLUMN IF EXISTS engagement_score;
ALTER TABLE users DROP COLUMN IF EXISTS user_segment;

-- Verify the cleanup
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
