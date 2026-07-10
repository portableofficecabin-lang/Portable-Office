-- Create app_role enum for admin roles
DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;
$$;

-- Create user_roles table for storing admin roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Check whether a user has a role
-- ::text handles the existing database where user_roles.role is TEXT
CREATE OR REPLACE FUNCTION public.has_role(
    _user_id UUID,
    _role public.app_role
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    WHERE ur.user_id = _user_id
      AND ur.role::text = _role::text
  );
$$;

-- Check whether the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(
    auth.uid(),
    'admin'::public.app_role
  );
$$;

-- RLS policy for user_roles
DROP POLICY IF EXISTS "Admins can view all roles"
ON public.user_roles;

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    company TEXT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    service_type TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'confirmed',
          'cancelled',
          'completed'
        )
      ),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create appointments"
ON public.appointments;

CREATE POLICY "Anyone can create appointments"
ON public.appointments
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all appointments"
ON public.appointments;

CREATE POLICY "Admins can view all appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update appointments"
ON public.appointments;

CREATE POLICY "Admins can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete appointments"
ON public.appointments;

CREATE POLICY "Admins can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Create enquiries table
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    enquiry_type TEXT NOT NULL DEFAULT 'general'
      CHECK (
        enquiry_type IN (
          'general',
          'quote',
          'product',
          'support'
        )
      ),
    product_id TEXT,
    product_name TEXT,
    status TEXT NOT NULL DEFAULT 'new'
      CHECK (
        status IN (
          'new',
          'read',
          'responded',
          'closed'
        )
      ),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on enquiries
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create enquiries"
ON public.enquiries;

CREATE POLICY "Anyone can create enquiries"
ON public.enquiries
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all enquiries"
ON public.enquiries;

CREATE POLICY "Admins can view all enquiries"
ON public.enquiries
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update enquiries"
ON public.enquiries;

CREATE POLICY "Admins can update enquiries"
ON public.enquiries
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete enquiries"
ON public.enquiries;

CREATE POLICY "Admins can delete enquiries"
ON public.enquiries
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate appointments trigger safely
DROP TRIGGER IF EXISTS update_appointments_updated_at
ON public.appointments;

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Recreate enquiries trigger safely
DROP TRIGGER IF EXISTS update_enquiries_updated_at
ON public.enquiries;

CREATE TRIGGER update_enquiries_updated_at
BEFORE UPDATE ON public.enquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();