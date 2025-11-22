-- Add roles column to placements table
ALTER TABLE public.placements 
ADD COLUMN roles TEXT[] DEFAULT '{}';

-- Create placement_applications table
CREATE TABLE public.placement_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placement_id UUID NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(placement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.placement_applications ENABLE ROW LEVEL SECURITY;

-- Students can insert their own applications
CREATE POLICY "Students can create their own applications"
ON public.placement_applications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'student'::app_role));

-- Students can view their own applications
CREATE POLICY "Students can view their own applications"
ON public.placement_applications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins and heads can view all applications
CREATE POLICY "Admins and heads can view all applications"
ON public.placement_applications
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'placement_head'::app_role)
);

-- Create index for faster queries
CREATE INDEX idx_placement_applications_placement_id ON public.placement_applications(placement_id);
CREATE INDEX idx_placement_applications_user_id ON public.placement_applications(user_id);