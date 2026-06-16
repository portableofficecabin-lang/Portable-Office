-- Add unique constraint to prevent multiple admin accounts (prevents race condition)
-- This creates a partial unique index that only allows one row with role = 'admin'
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_admin 
ON public.user_roles (role) 
WHERE role = 'admin';