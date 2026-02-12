import { useState, useEffect, useCallback } from 'react';
import { djangoApi } from '@/lib/api/client';

interface UseEnrollmentGuardResult {
  isEnrolled: boolean | null;
  isLoading: boolean;
  enrollmentStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | null;
  refetch: () => Promise<void>;
}

/**
 * Guard hook that checks if user has completed face enrollment.
 * Uses Django API as the source of truth for enrollment status.
 * Falls back to checking Django user's face_image_url field.
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
      // Check via Django enrollment status endpoint
      const result = await djangoApi.checkFaceEnrollmentStatus(userId);

      if (result.data && !result.error && result.data.face_embedding_status) {
        const enrolled = result.data.face_image_uploaded === true && result.data.face_embedding_status === 'READY';
        setIsEnrolled(enrolled);
        setEnrollmentStatus(result.data.face_embedding_status);
        console.log('[FaceEnrollmentGuard] Django status:', {
          face_image_uploaded: result.data.face_image_uploaded,
          face_embedding_status: result.data.face_embedding_status,
          enrolled
        });
        return;
      }

      // Fallback: Check Django user profile for face_image_url
      console.log('[FaceEnrollmentGuard] Enrollment status endpoint unavailable, checking Django user profile...');
      const userResult = await djangoApi.getProfile();
      
      if (userResult.data && !userResult.error) {
        const enrolled = !!userResult.data.face_image_url && userResult.data.face_image_url !== 'null';
        setIsEnrolled(enrolled);
        setEnrollmentStatus(enrolled ? 'READY' : 'PENDING');
        console.log('[FaceEnrollmentGuard] Django user fallback:', {
          face_image_url: userResult.data.face_image_url ? 'exists' : 'null',
          enrolled
        });
        return;
      }

      // If Django is unreachable, assume not enrolled
      console.warn('[FaceEnrollmentGuard] Django unreachable, assuming not enrolled');
      setIsEnrolled(false);
      setEnrollmentStatus(null);
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
