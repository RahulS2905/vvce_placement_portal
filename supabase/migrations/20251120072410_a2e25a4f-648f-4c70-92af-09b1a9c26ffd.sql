-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a properly restricted policy that allows:
-- 1. Users to view their own profile
-- 2. Admins and placement heads to view all profiles (needed for placement management)
CREATE POLICY "Users can view profiles with role restrictions" 
ON public.profiles
FOR SELECT 
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'placement_head'::app_role)
);