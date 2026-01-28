import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Backend response codes
type ResponseCode = 
  | 'NO_FACE' 
  | 'FACE_UNSTABLE' 
  | 'FACE_RECOGNIZED' 
  | 'TEMP_USER' 
  | 'ALREADY_MARKED'
  | 'ERROR';

// Attendance status for each face
export type AttendanceStatus = 'detecting' | 'confirmed' | 'visitor';

export interface TrackedFace {
  id: string; // user_id or temp_face_id
  name: string;
  type: 'member' | 'visitor';
  confidence: number | null;
  bbox: number[];
  attendanceStatus: AttendanceStatus;
  backendStatus?: string; // 'marked' | 'already_marked' | 'recorded' | 'updated' | 'error'
  lastSeen: number; // timestamp
}

interface RawFace {
  name?: string;
  recognized?: boolean;
  confidence?: number | null;
  bbox?: number[];
  user_id?: string;
  temp_face_id?: string;
  type?: 'member' | 'visitor';
  attendance_status?: string;
}

interface RecognitionResult {
  success: boolean;
  code?: ResponseCode;
  faces?: RawFace[];
  faces_count?: number;
  timestamp?: string;
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
  django_status?: unknown;
  error?: string;
  timestamp: string;
}

// Face timeout - if not seen for this duration, remove from state
const FACE_TIMEOUT_MS = 3000;

/**
 * Safely parse a raw face object from the backend
 * Returns null if the face is invalid or missing required fields
 */
const parseRawFace = (raw: unknown, index: number): TrackedFace | null => {
  if (!raw || typeof raw !== 'object') {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[useFaceRecognition] Invalid face at index ${index}: not an object`);
    }
    return null;
  }

  const face = raw as RawFace;

  // Validate bbox - must be array with at least 4 numbers
  if (!face.bbox || !Array.isArray(face.bbox) || face.bbox.length < 4) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[useFaceRecognition] Invalid bbox at index ${index}:`, face.bbox);
    }
    return null;
  }

  // Validate bbox values are numbers
  const bboxValid = face.bbox.slice(0, 4).every(v => typeof v === 'number' && !isNaN(v));
  if (!bboxValid) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[useFaceRecognition] Invalid bbox values at index ${index}:`, face.bbox);
    }
    return null;
  }

  // Determine face ID
  const id = face.user_id || face.temp_face_id || `unknown_${Date.now()}_${index}`;
  
  // Determine type
  const type: 'member' | 'visitor' = face.type === 'member' ? 'member' : 'visitor';
  
  // Determine attendance status based on backend response
  let attendanceStatus: AttendanceStatus = 'detecting';
  if (face.attendance_status === 'marked' || 
      face.attendance_status === 'already_marked' || 
      face.attendance_status === 'recorded') {
    attendanceStatus = type === 'member' ? 'confirmed' : 'visitor';
  } else if (type === 'visitor' && face.temp_face_id) {
    attendanceStatus = 'visitor';
  }

  return {
    id,
    name: face.name || (type === 'visitor' ? 'Visitor' : 'Unknown'),
    type,
    confidence: typeof face.confidence === 'number' ? face.confidence : null,
    bbox: face.bbox.slice(0, 4),
    attendanceStatus,
    backendStatus: face.attendance_status,
    lastSeen: Date.now(),
  };
};

/**
 * Interpret backend response code and determine how to update face state
 */
const interpretResponseCode = (result: RecognitionResult): {
  shouldClearFaces: boolean;
  shouldKeepDetecting: boolean;
  faces: TrackedFace[];
} => {
  const code = result.code;
  
  // Parse faces safely
  const parsedFaces: TrackedFace[] = [];
  if (result.faces && Array.isArray(result.faces)) {
    for (let i = 0; i < result.faces.length; i++) {
      const parsed = parseRawFace(result.faces[i], i);
      if (parsed) {
        parsedFaces.push(parsed);
      }
    }
  }

  switch (code) {
    case 'NO_FACE':
      return { shouldClearFaces: true, shouldKeepDetecting: false, faces: [] };
    
    case 'FACE_UNSTABLE':
      // Keep detecting - face is present but not stable enough
      return { 
        shouldClearFaces: false, 
        shouldKeepDetecting: true, 
        faces: parsedFaces.map(f => ({ ...f, attendanceStatus: 'detecting' as AttendanceStatus }))
      };
    
    case 'FACE_RECOGNIZED':
      return { 
        shouldClearFaces: false, 
        shouldKeepDetecting: false, 
        faces: parsedFaces.map(f => ({ 
          ...f, 
          attendanceStatus: f.type === 'member' ? 'confirmed' as AttendanceStatus : f.attendanceStatus 
        }))
      };
    
    case 'TEMP_USER':
      return { 
        shouldClearFaces: false, 
        shouldKeepDetecting: false, 
        faces: parsedFaces.map(f => ({ ...f, attendanceStatus: 'visitor' as AttendanceStatus }))
      };
    
    case 'ALREADY_MARKED':
      return { 
        shouldClearFaces: false, 
        shouldKeepDetecting: false, 
        faces: parsedFaces.map(f => ({ ...f, attendanceStatus: 'confirmed' as AttendanceStatus }))
      };
    
    default:
      // Legacy handling - no code, just check if faces exist
      if (parsedFaces.length > 0) {
        return { shouldClearFaces: false, shouldKeepDetecting: false, faces: parsedFaces };
      }
      // No faces in response but no explicit NO_FACE code - keep previous state briefly
      return { shouldClearFaces: false, shouldKeepDetecting: true, faces: [] };
  }
};

export const useFaceRecognition = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Persistent face state that survives across frames
  const [trackedFaces, setTrackedFaces] = useState<TrackedFace[]>([]);
  const lastUpdateRef = useRef<number>(Date.now());

  /**
   * Check if capture should be paused based on current face state
   */
  const shouldPauseCapture = useCallback((): boolean => {
    return trackedFaces.some(
      face => face.attendanceStatus === 'confirmed' || face.attendanceStatus === 'visitor'
    );
  }, [trackedFaces]);

  /**
   * Clear all tracked faces - call when face leaves frame or explicit reset
   */
  const clearFaces = useCallback(() => {
    setTrackedFaces([]);
    lastUpdateRef.current = Date.now();
  }, []);

  /**
   * Check for stale faces and remove them
   */
  const pruneStalefaces = useCallback(() => {
    const now = Date.now();
    setTrackedFaces(prev => 
      prev.filter(face => now - face.lastSeen < FACE_TIMEOUT_MS)
    );
  }, []);

  const recognizeFace = useCallback(async (
    imageBase64: string, 
    organizationId?: string
  ): Promise<{ 
    success: boolean; 
    faces: TrackedFace[]; 
    shouldPause: boolean;
    error?: string;
  }> => {
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

      const result = data as RecognitionResult;
      
      if (!result.success) {
        const msg = result.error || 'Recognition failed';
        setError(msg);
        // Don't clear faces on error - keep previous state
        return { 
          success: false, 
          faces: trackedFaces, 
          shouldPause: false,
          error: msg 
        };
      }

      // Interpret response and update state
      const { shouldClearFaces, shouldKeepDetecting, faces: newFaces } = interpretResponseCode(result);
      
      if (shouldClearFaces) {
        setTrackedFaces([]);
        return { success: true, faces: [], shouldPause: false };
      }

      if (newFaces.length > 0) {
        // Update tracked faces with new data
        setTrackedFaces(prev => {
          const updated = [...prev];
          
          for (const newFace of newFaces) {
            const existingIndex = updated.findIndex(f => f.id === newFace.id);
            if (existingIndex >= 0) {
              // Update existing face
              updated[existingIndex] = {
                ...updated[existingIndex],
                ...newFace,
                lastSeen: Date.now(),
              };
            } else {
              // Add new face
              updated.push(newFace);
            }
          }
          
          return updated;
        });
        
        lastUpdateRef.current = Date.now();
        
        // Check if we should pause (confirmed or visitor)
        const shouldPause = newFaces.some(
          f => f.attendanceStatus === 'confirmed' || f.attendanceStatus === 'visitor'
        );
        
        return { success: true, faces: newFaces, shouldPause };
      }

      // No new faces but shouldKeepDetecting - return current state
      if (shouldKeepDetecting) {
        return { success: true, faces: trackedFaces, shouldPause: false };
      }

      return { success: true, faces: trackedFaces, shouldPause: false };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Recognition failed';
      setError(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('[useFaceRecognition] Error:', err);
      }
      // Don't clear faces on error
      return { success: false, faces: trackedFaces, shouldPause: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, [trackedFaces]);

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

      const result = data as RegistrationResult;
      if (!result.success) {
        const msg = result.error || 'Registration failed';
        setError(msg);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.error('[useFaceRecognition] Registration error:', err);
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.error('[useFaceRecognition] Health check error:', err);
      }
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
    trackedFaces,
    error,
    clearError,
    clearFaces,
    pruneStalefaces,
    shouldPauseCapture,
  };
};
