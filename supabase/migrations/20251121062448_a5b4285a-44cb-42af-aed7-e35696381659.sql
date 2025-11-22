-- Update the videos bucket to be public so approved videos can be viewed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'videos';

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;

-- Create storage policy to allow everyone to view videos
CREATE POLICY "Anyone can view videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'videos');

-- Keep existing upload policy for authenticated users
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'videos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);