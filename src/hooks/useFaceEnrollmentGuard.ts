import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseEnrollmentGuardResult {
  isEnrolled: boolean | null;
  isLoading: boolean;
  enrollmentStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | null;
  refetch: () => Promise<void>;
}

/**
 * Guard hook that checks if user has completed face enrollment.
 * 
 * Since Django doesn't have a dedicated enrollment-status endpoint yet,
 * we check the Supabase profiles table for face_image_url as a fallback.
 * 
 * User is considered enrolled if they have a face_image_url in their profile.
 */
export const useFaceEnrollmentGuard = (userId: string | undefined): UseEnrollmentGuardResult => {
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | null>(null);

  const checkEnrollment = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setIsEnrolled(false);
      return;
    }

    setIsLoading(true);

    try {
      // First, try to check via Django proxy (if endpoint exists)
      const { data: proxyData, error: proxyError } = await supabase.functions.invoke('django-proxy', {
        body: {
          action: 'check-enrollment-status',
          user_id: userId,
        },
      });

      // If Django returned valid enrollment data, use it
      if (!proxyError && proxyData && !proxyData.error && proxyData.face_embedding_status) {
        const enrolled = proxyData.face_image_uploaded === true && proxyData.face_embedding_status === 'READY';
        setIsEnrolled(enrolled);
        setEnrollmentStatus(proxyData.face_embedding_status);
        console.log('[FaceEnrollmentGuard] Django status:', {
          face_image_uploaded: proxyData.face_image_uploaded,
          face_embedding_status: proxyData.face_embedding_status,
          enrolled
        });
        return;
      }

      // Fallback: Check Supabase profile for face_image_url
      console.log('[FaceEnrollmentGuard] Django endpoint not available, checking Supabase profile...');
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('face_image_url')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('[FaceEnrollmentGuard] Profile fetch error:', profileError);
        // On error, assume not enrolled to be safe
        setIsEnrolled(false);
        setEnrollmentStatus(null);
        return;
      }

      // User is enrolled if they have a face_image_url
      const enrolled = !!profile?.face_image_url;
      setIsEnrolled(enrolled);
      setEnrollmentStatus(enrolled ? 'READY' : 'PENDING');
      
      console.log('[FaceEnrollmentGuard] Supabase fallback status:', {
        face_image_url: profile?.face_image_url ? 'exists' : 'null',
        enrolled
      });
    } catch (err) {
      console.error('[FaceEnrollmentGuard] Check failed:', err);
      setIsEnrolled(false);
      setEnrollmentStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkEnrollment();
  }, [checkEnrollment]);

  return {
    isEnrolled,
    isLoading,
    enrollmentStatus,
    refetch: checkEnrollment,
  };
};
