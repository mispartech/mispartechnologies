import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseEnrollmentGuardResult {
  isEnrolled: boolean | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export const useFaceEnrollmentGuard = (userId: string | undefined): UseEnrollmentGuardResult => {
  const [isEnrolled, setIsEnrolled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkEnrollment = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('face_embeddings')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking face enrollment:', error);
        // If error, assume not enrolled to be safe
        setIsEnrolled(false);
      } else {
        setIsEnrolled(!!data);
      }
    } catch (err) {
      console.error('Face enrollment check failed:', err);
      setIsEnrolled(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkEnrollment();
  }, [userId]);

  return {
    isEnrolled,
    isLoading,
    refetch: checkEnrollment,
  };
};
