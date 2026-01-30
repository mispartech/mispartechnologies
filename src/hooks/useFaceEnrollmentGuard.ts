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
      // Check both face_embeddings table AND profiles.face_image_url
      const [embeddingResult, profileResult] = await Promise.all([
        supabase
          .from('face_embeddings')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('face_image_url')
          .eq('id', userId)
          .maybeSingle()
      ]);

      if (embeddingResult.error) {
        console.error('Error checking face embeddings:', embeddingResult.error);
      }
      if (profileResult.error) {
        console.error('Error checking profile face image:', profileResult.error);
      }

      // User is enrolled if they have either a face embedding OR a face_image_url
      const hasEmbedding = !!embeddingResult.data;
      const hasFaceImage = !!profileResult.data?.face_image_url;
      
      setIsEnrolled(hasEmbedding || hasFaceImage);
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
