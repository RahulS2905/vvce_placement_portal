-- Add DELETE policy for students to withdraw their own applications
CREATE POLICY "Students can delete own applications"
ON placement_applications FOR DELETE
USING (
  user_id = auth.uid() AND
  has_role(auth.uid(), 'student'::app_role)
);

-- Add UPDATE policy for admins and placement heads to update application status
CREATE POLICY "Admins can update application status"
ON placement_applications FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'placement_head'::app_role)
);