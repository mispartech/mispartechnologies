-- Drop existing department policies
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;

-- Create new RLS policies that check user_roles table
CREATE POLICY "Org admins can manage departments"
ON public.departments
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin', 'parish_pastor')
  )
);

CREATE POLICY "Anyone in org can view departments"
ON public.departments
FOR SELECT
USING (true);