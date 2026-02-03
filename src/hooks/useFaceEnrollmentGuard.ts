import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseEnrollmentGuardResult {
  isEnrolled: boolean | null;
  isLoading: boolean;
  enrollmentStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | null;
  refetch: () => Promise<void>;
}

/**
 * Guard hook that checks if user has completed face enrollment via Django API.
 * Uses the django-proxy edge function to avoid CORS issues.
 * 
 * User is considered enrolled if:
 * - face_image_uploaded === true AND
 * - face_embedding_status === "READY"
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
      // Call Django API through the edge function proxy to avoid CORS
      const { data, error } = await supabase.functions.invoke('django-proxy', {
        body: {
          action: 'check-enrollment-status',
          user_id: userId,
        },
      });

      if (error) {
        console.error('[FaceEnrollmentGuard] Edge function error:', error);
        setIsEnrolled(false);
        setEnrollmentStatus(null);
        return;
      }

      if (data?.error) {
        console.error('[FaceEnrollmentGuard] Django API error:', data.error);
        // On error, assume not enrolled to be safe
        setIsEnrolled(false);
        setEnrollmentStatus(null);
        return;
      }

      const { face_image_uploaded, face_embedding_status } = data;
      
      // User is enrolled ONLY if both conditions are met
      const enrolled = face_image_uploaded === true && face_embedding_status === 'READY';
      
      setIsEnrolled(enrolled);
      setEnrollmentStatus(face_embedding_status);
      
      console.log('[FaceEnrollmentGuard] Status:', {
        face_image_uploaded,
        face_embedding_status,
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
