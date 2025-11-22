-- Add RLS policy for public viewing of announcement files
CREATE POLICY "Public can view announcement files"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');