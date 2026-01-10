-- Tighten overly-permissive INSERT policies flagged by linter

-- attendance: require an authenticated user when inserting from client-side
DROP POLICY IF EXISTS "System can insert attendance" ON public.attendance;
CREATE POLICY "System can insert attendance"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- temp_attendance: require an authenticated user when inserting from client-side
DROP POLICY IF EXISTS "System can insert temp attendance" ON public.temp_attendance;
CREATE POLICY "System can insert temp attendance"
ON public.temp_attendance
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
