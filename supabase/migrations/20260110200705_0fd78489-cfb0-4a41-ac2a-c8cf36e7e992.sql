-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create organization during onboarding" ON public.organizations;

-- Create a new INSERT policy that allows any authenticated user to insert
-- Using a more explicit check that verifies the user is logged in
CREATE POLICY "Authenticated users can create organization during onboarding"
ON public.organizations
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);