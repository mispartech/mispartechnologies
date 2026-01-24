import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecognizedFace {
  name: string;
  recognized: boolean;
  confidence: number | null;
  bbox: number[];
  user_id?: string;
  temp_face_id?: string;
  type: 'member' | 'visitor';
  attendance_status?: 'marked' | 'already_marked' | 'recorded' | 'updated' | 'error';
}

interface RecognitionResult {
  success: boolean;
  faces: RecognizedFace[];
  faces_count: number;
  timestamp: string;
  error?: string;
}

interface RegistrationResult {
  success: boolean;
  user_id?: string;
  message?: string;
  embedding_size?: number;
  error?: string;
}

interface HealthCheckResult {
  success: boolean;
  django_api: 'connected' | 'unreachable' | 'error';
  edge_function: string;
  django_status?: any;
  error?: string;
  timestamp: string;
}

export const useFaceRecognition = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognizeFace = useCallback(async (
    imageBase64: string, 
    organizationId?: string
  ): Promise<RecognitionResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('face-recognition', {
        body: {
          action: 'recognize',
          image: imageBase64,
          organization_id: organizationId,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Recognition failed');
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

      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
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

  const checkHealth = useCallback(async (): Promise<HealthCheckResult | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('face-recognition', {
        body: { action: 'health' },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return data as HealthCheckResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Health check failed';
      console.error('Health check error:', err);
      return {
        success: false,
        django_api: 'unreachable',
        edge_function: 'error',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    recognizeFace,
    registerFace,
    checkHealth,
    isProcessing,
    lastResult,
    error,
    clearError,
  };
};
