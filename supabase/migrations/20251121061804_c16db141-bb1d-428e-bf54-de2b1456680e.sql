-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own videos" ON videos;

-- Create new policy allowing users to see approved videos OR their own videos
CREATE POLICY "Users can view approved videos or their own videos"
ON videos
FOR SELECT
USING (
  status = 'approved' OR 
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'training_head'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);