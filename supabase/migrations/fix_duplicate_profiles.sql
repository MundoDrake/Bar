-- =================================================================
-- FIXED: REMOVE DUPLICATES AND ADD CONSTRAINT TO USER_PROFILES
-- Run this in the Supabase SQL Editor to fix the concurrency issue
-- =================================================================

-- 1. Remove duplicate profiles, keeping only the oldest one for each user
DELETE FROM user_profiles
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY user_id 
                   ORDER BY created_at ASC
               ) as row_num
        FROM user_profiles
    ) t
    WHERE t.row_num > 1
);

-- 2. Add a UNIQUE constraint to user_id to prevent future duplicates
-- This ensures the database will block any race condition attempts
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
