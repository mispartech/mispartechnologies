-- Create service_schedules table for storing organization service days and times
CREATE TABLE public.service_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  attendance_buffer_minutes INTEGER DEFAULT 30, -- How many minutes before/after to allow attendance
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_schedules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view schedules in their organization"
ON public.service_schedules
FOR SELECT
USING (organization_id = get_user_organization(auth.uid()));

CREATE POLICY "Admins can manage schedules"
ON public.service_schedules
FOR ALL
USING (
  organization_id = get_user_organization(auth.uid()) 
  AND is_org_admin(auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_service_schedules_updated_at
BEFORE UPDATE ON public.service_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_service_schedules_org_day ON public.service_schedules(organization_id, day_of_week);
CREATE INDEX idx_service_schedules_active ON public.service_schedules(organization_id, is_active);