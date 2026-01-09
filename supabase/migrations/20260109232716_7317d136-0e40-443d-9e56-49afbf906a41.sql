-- First, let's make sure all restrictive INSERT policies are dropped
DROP POLICY IF EXISTS "Anyone can create organization during onboarding" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organization during onboarding" ON public.organizations;

-- Re-create a properly permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create organization during onboarding" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (true);