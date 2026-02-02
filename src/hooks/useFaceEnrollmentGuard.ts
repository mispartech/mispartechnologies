import { useState, useEffect, useCallback } from 'react';
import { djangoApi } from '@/lib/api/client';

interface UseEnrollmentGuardResult {
  isEnrolled: boolean | null;
  isLoading: boolean;
  enrollmentStatus: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | null;
  refetch: () => Promise<void>;
}

/**
 * Guard hook that checks if user has completed face enrollment via Django API.
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
      const result = await djangoApi.checkFaceEnrollmentStatus(userId);

      if (result.error) {
        console.error('Error checking face enrollment status:', result.error);
        // On error, assume not enrolled to be safe
        setIsEnrolled(false);
        setEnrollmentStatus(null);
      } else if (result.data) {
        const { face_image_uploaded, face_embedding_status } = result.data;
        
        // User is enrolled ONLY if both conditions are met
        const enrolled = face_image_uploaded === true && face_embedding_status === 'READY';
        
        setIsEnrolled(enrolled);
        setEnrollmentStatus(face_embedding_status);
        
        console.log('[FaceEnrollmentGuard] Status:', {
          face_image_uploaded,
          face_embedding_status,
          enrolled
        });
      } else {
        // No data returned, assume not enrolled
        setIsEnrolled(false);
        setEnrollmentStatus(null);
      }
    } catch (err) {
      console.error('Face enrollment check failed:', err);
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
