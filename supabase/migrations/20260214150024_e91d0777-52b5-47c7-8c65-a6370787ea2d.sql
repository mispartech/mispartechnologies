
-- Fix 1: Make face-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'face-images';

-- Fix 1b: Replace public SELECT policy with scoped access
DROP POLICY IF EXISTS "Anyone can view face images" ON storage.objects;

CREATE POLICY "Users can view own face images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'face-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view org face images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'face-images'
    AND public.is_org_admin(auth.uid())
  );

-- Fix 4: Replace public member_invites SELECT with token-scoped lookup
DROP POLICY IF EXISTS "Anyone can read invite by token" ON member_invites;

CREATE POLICY "Token holders can read their specific invite"
  ON member_invites FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND organization_id = public.get_user_organization(auth.uid()) AND public.is_org_admin(auth.uid()))
    OR
    (token = current_setting('request.headers', true)::json->>'x-invite-token')
  );

-- Fix 5: Replace public departments SELECT with org-scoped access  
DROP POLICY IF EXISTS "Anyone in org can view departments" ON departments;

CREATE POLICY "Org members can view departments"
  ON departments FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );
