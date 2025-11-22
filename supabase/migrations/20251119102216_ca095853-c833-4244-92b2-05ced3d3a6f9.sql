-- Add internship and experience fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS internship_company TEXT,
ADD COLUMN IF NOT EXISTS internship_role TEXT,
ADD COLUMN IF NOT EXISTS internship_duration TEXT,
ADD COLUMN IF NOT EXISTS internship_description TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[],
ADD COLUMN IF NOT EXISTS achievements TEXT,
ADD COLUMN IF NOT EXISTS cgpa NUMERIC(4,2);