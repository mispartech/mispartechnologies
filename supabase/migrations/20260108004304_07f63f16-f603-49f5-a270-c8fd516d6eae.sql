-- Create enum for organization types
CREATE TYPE public.organization_type AS ENUM (
  'church',
  'corporate',
  'school',
  'hospital',
  'government',
  'nonprofit',
  'other'
);

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'admin',
  'manager',
  'member',
  'parish_pastor',
  'secretary',
  'usher'
);

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type organization_type NOT NULL DEFAULT 'other',
  industry TEXT,
  size_range TEXT, -- e.g., '1-10', '11-50', '51-200', '201-500', '500+'
  address TEXT,
  city TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  features_enabled TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role, organization_id)
);

-- Add organization_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1
$$;

-- Function to check if user is admin of their organization
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin', 'parish_pastor')
  )
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
USING (
  id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Admins can update their organization"
ON public.organizations
FOR UPDATE
USING (
  id = public.get_user_organization(auth.uid()) 
  AND public.is_org_admin(auth.uid())
);

CREATE POLICY "Anyone can create organization during onboarding"
ON public.organizations
FOR INSERT
WITH CHECK (true);

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their organization"
ON public.user_roles
FOR SELECT
USING (
  organization_id = public.get_user_organization(auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Admins can manage roles in their organization"
ON public.user_roles
FOR ALL
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.is_org_admin(auth.uid())
);

CREATE POLICY "Users can insert their own role during signup"
ON public.user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Update profiles RLS to allow viewing org members
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR organization_id = public.get_user_organization(auth.uid())
);

-- Trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();