-- Fix order values to use proper lexicographic ordering
-- This script will reset all prompt order values to use letters instead of numbers

UPDATE prompts 
SET "order" = CASE 
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 1 THEN 'a0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 2 THEN 'b0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 3 THEN 'c0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 4 THEN 'd0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 5 THEN 'e0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 6 THEN 'f0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 7 THEN 'g0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 8 THEN 'h0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 9 THEN 'i0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 10 THEN 'j0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 11 THEN 'k0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 12 THEN 'l0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 13 THEN 'm0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 14 THEN 'n0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 15 THEN 'o0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 16 THEN 'p0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 17 THEN 'q0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 18 THEN 'r0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 19 THEN 's0'
  WHEN ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) = 20 THEN 't0'
  ELSE CHR(96 + (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) % 26)) || '0'
END,
updated_at = NOW()
WHERE "order" IS NOT NULL;
