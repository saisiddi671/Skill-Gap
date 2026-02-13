-- Add approval column to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT false;

-- Auto-approve existing admin users
UPDATE public.profiles 
SET is_approved = true 
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);