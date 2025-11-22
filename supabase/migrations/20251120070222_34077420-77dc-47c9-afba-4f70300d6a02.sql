-- Change target_branch from text to text array to support multiple branches
ALTER TABLE placements 
ALTER COLUMN target_branch TYPE text[] USING 
  CASE 
    WHEN target_branch IS NULL THEN NULL
    WHEN target_branch = 'all' THEN NULL
    ELSE ARRAY[target_branch]
  END;