-- Create admin_invites table for admin invitation workflow
CREATE TABLE public.admin_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  invited_role app_role NOT NULL DEFAULT 'admin',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_invites
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_invites
CREATE POLICY "Super admins can manage invites"
ON public.admin_invites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'super_admin'
  )
);

CREATE POLICY "Org admins can view their org invites"
ON public.admin_invites
FOR SELECT
USING (
  organization_id = get_user_organization(auth.uid())
  AND is_org_admin(auth.uid())
);

-- Create activity_logs table for tracking user actions
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_logs
CREATE POLICY "System can insert logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view org logs"
ON public.activity_logs
FOR SELECT
USING (
  organization_id = get_user_organization(auth.uid())
  AND is_org_admin(auth.uid())
);

-- Update is_org_admin function to include department_head
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin', 'parish_pastor', 'department_head')
  )
$$;

-- Create function to check department head access
CREATE OR REPLACE FUNCTION public.is_department_head(_user_id uuid, _department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.departments d
    WHERE d.id = _department_id
      AND d.department_head_id = _user_id
  )
$$;

-- Add status column to temp_attendance for claiming workflow
ALTER TABLE public.temp_attendance
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;

-- Update temp_attendance RLS to allow updates for claiming
DROP POLICY IF EXISTS "System can insert temp attendance" ON public.temp_attendance;
DROP POLICY IF EXISTS "Anyone can view temp attendance" ON public.temp_attendance;

CREATE POLICY "Authenticated users can view temp attendance"
ON public.temp_attendance
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert temp attendance"
ON public.temp_attendance
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update temp attendance"
ON public.temp_attendance
FOR UPDATE
USING (is_org_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_created 
ON public.activity_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user 
ON public.activity_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_invites_token 
ON public.admin_invites(token);

CREATE INDEX IF NOT EXISTS idx_admin_invites_email 
ON public.admin_invites(email);