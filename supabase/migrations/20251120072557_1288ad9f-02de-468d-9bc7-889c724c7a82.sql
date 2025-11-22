-- Add INSERT policy to notifications table
-- Only admins, placement heads, and training heads can create notifications
CREATE POLICY "Only admins and heads can create notifications" 
ON public.notifications
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'placement_head'::app_role)
  OR has_role(auth.uid(), 'training_head'::app_role)
);