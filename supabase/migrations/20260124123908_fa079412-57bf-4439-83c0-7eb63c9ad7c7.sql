-- Drop the existing restrictive SELECT policy on attendance
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;

-- Create a new policy that allows admins to view all attendance in their organization
CREATE POLICY "Users can view organization attendance"
ON public.attendance
FOR SELECT
USING (
  -- Users can see their own attendance
  auth.uid() = user_id
  OR
  -- Admins can see all attendance for members in their organization
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin', 'parish_pastor', 'department_head', 'ushering_head_admin', 'usher_admin')
    AND ur.organization_id = (
      SELECT p.organization_id FROM profiles p WHERE p.id = attendance.user_id
    )
  )
);