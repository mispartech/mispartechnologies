import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecognizedFace {
  name: string;
  distance: number | null;
  recognized: boolean;
  bbox: number[];
}

interface RecognitionResult {
  success: boolean;
  faces: RecognizedFace[];
  timestamp: string;
  error?: string;
}

interface RegistrationResult {
  success: boolean;
  user_id?: string;
  embedding_size?: number;
  error?: string;
}

export const useFaceRecognition = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognizeFace = useCallback(async (imageBase64: string): Promise<RecognitionResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('face-recognition', {
        body: {
          action: 'recognize',
          image: imageBase64,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const result = data as RecognitionResult;
      setLastResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Recognition failed';
      setError(errorMessage);
      console.error('Face recognition error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const registerFace = useCallback(async (
    imageBase64: string,
    userData: { user_id: string; name: string }
  ): Promise<RegistrationResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('face-recognition', {
        body: {
          action: 'register',
          image: imageBase64,
          user_data: userData,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return data as RegistrationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      console.error('Face registration error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    recognizeFace,
    registerFace,
    isProcessing,
    lastResult,
    error,
    clearError,
  };
};
