-- Add RLS policy to allow admins and training heads to delete videos
CREATE POLICY "Admins and training heads can delete videos"
ON videos
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'training_head'::app_role)
);