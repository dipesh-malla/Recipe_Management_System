-- Fix the follows table sequence
-- This script resets the sequence to the correct value based on existing data

-- First, find the maximum ID currently in the follows table
-- Then set the sequence to start from the next available ID

SELECT setval('follows_id_seq', COALESCE((SELECT MAX(id) FROM follows), 0) + 1, false);

-- Verify the sequence value
SELECT currval('follows_id_seq');

-- Optional: View current follows to debug
-- SELECT * FROM follows ORDER BY id;
