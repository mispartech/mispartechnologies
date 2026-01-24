-- Create member_invites table for tracking pending member registrations
CREATE TABLE public.member_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  gender TEXT,
  department_id UUID REFERENCES public.departments(id),
  organization_id UUID REFERENCES public.organizations(id),
  invited_by UUID,
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.member_invites ENABLE ROW LEVEL SECURITY;

-- Policies: Admins in same org can manage invites
CREATE POLICY "Admins can view org invites" 
ON public.member_invites 
FOR SELECT 
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.is_org_admin(auth.uid())
);

CREATE POLICY "Admins can create invites" 
ON public.member_invites 
FOR INSERT 
WITH CHECK (
  organization_id = public.get_user_organization(auth.uid())
  AND public.is_org_admin(auth.uid())
);

CREATE POLICY "Admins can update invites" 
ON public.member_invites 
FOR UPDATE 
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.is_org_admin(auth.uid())
);

CREATE POLICY "Admins can delete invites" 
ON public.member_invites 
FOR DELETE 
USING (
  organization_id = public.get_user_organization(auth.uid())
  AND public.is_org_admin(auth.uid())
);

-- Public policy for accepting invites via token (no auth required)
CREATE POLICY "Anyone can read invite by token" 
ON public.member_invites 
FOR SELECT 
USING (true);

-- Create index for token lookups
CREATE INDEX idx_member_invites_token ON public.member_invites(token);
CREATE INDEX idx_member_invites_email ON public.member_invites(email);
CREATE INDEX idx_member_invites_org ON public.member_invites(organization_id);