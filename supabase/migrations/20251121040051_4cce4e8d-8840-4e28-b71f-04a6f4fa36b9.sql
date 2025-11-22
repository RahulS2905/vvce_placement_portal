-- Add resume_shared column to placement_applications table
ALTER TABLE placement_applications 
ADD COLUMN resume_shared boolean DEFAULT false NOT NULL;