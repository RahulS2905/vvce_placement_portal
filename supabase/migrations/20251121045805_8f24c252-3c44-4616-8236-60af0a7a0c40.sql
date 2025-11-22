-- Create storage bucket for announcement attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

-- Add file-related columns to announcements table
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Create RLS policies for announcements bucket
CREATE POLICY "Anyone can view announcement files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'announcements');

CREATE POLICY "Admins and heads can upload announcement files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'announcements' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'placement_head'::app_role) 
    OR has_role(auth.uid(), 'training_head'::app_role)
  )
);

CREATE POLICY "Admins and heads can delete announcement files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcements' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'placement_head'::app_role) 
    OR has_role(auth.uid(), 'training_head'::app_role)
  )
);