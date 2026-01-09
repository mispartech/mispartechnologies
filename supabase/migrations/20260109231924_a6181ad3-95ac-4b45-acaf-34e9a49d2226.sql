-- Drop the existing restrictive INSERT policy on organizations
DROP POLICY IF EXISTS "Anyone can create organization during onboarding" ON public.organizations;

-- Create a new PERMISSIVE INSERT policy for authenticated users during onboarding
CREATE POLICY "Authenticated users can create organization during onboarding" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (true);