-- Update handle_new_user function to respect user role selection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, year, branch, roll_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'year')::INTEGER, 1),
    COALESCE(NEW.raw_user_meta_data->>'branch', 'Computer Science'),
    COALESCE(NEW.raw_user_meta_data->>'roll_number', '')
  );
  
  -- Determine role from metadata, default to student
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student')::app_role;
  
  -- Assign the selected role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;