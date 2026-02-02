import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Backend response types - matches Django API contract
 */
type ResponseType = 'KNOWN' | 'TEMP' | null;

/**
 * Attendance status for UI display
 * 'detecting' = scanning animation (face seen but not yet processed)
 * 'confirmed' = recognized member with attendance marked by backend
 */
export type AttendanceStatus = 'detecting' | 'confirmed';

export interface TrackedFace {
  id: string; // user_id for KNOWN users, temp_user_id for TEMP users
  name: string;
  type: 'member' | 'visitor';
  confidence: number | null;
  bbox: number[];
  attendanceStatus: AttendanceStatus;
  attendanceMarked?: boolean; // From backend
  requiresClaim?: boolean; // For temp users
  lastSeen: number;
}

/**
 * Django API response format (new contract)
 */
interface DjangoResponse {
  success: boolean;
  code?: string;
  type?: ResponseType;
  user_id?: string;
  temp_user_id?: string;
  confidence?: number;
  attendance_marked?: boolean;
  requires_claim?: boolean;
  name?: string;
  bbox?: number[];
  faces?: LegacyFace[]; // Legacy format support
  faces_count?: number;
  message?: string;
  error?: string;
  timestamp?: string;
}

/**
 * Legacy face format from older Django responses
 */
interface LegacyFace {
  name?: string;
  recognized?: boolean;
  confidence?: number | null;
  bbox?: number[];
  user_id?: string;
  temp_user_id?: string;
  temp_face_id?: string;
  type?: 'member' | 'visitor';
  attendance_status?: string;
}

interface RegistrationResult {
  success: boolean;
  user_id?: string;
  message?: string;
  embedding_saved?: boolean;
  error?: string;
  code?: string;
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
 * Parse Django response into TrackedFace array
 * Supports both new single-face format and legacy faces array
 */
const parseDjangoResponse = (response: DjangoResponse): {
  faces: TrackedFace[];
  scanningBboxes: number[][];
} => {
  const faces: TrackedFace[] = [];
  const scanningBboxes: number[][] = [];
  const now = Date.now();

  // Handle new format: single face in response root
  if (response.type === 'KNOWN' && response.user_id) {
    faces.push({
      id: response.user_id,
      name: response.name || 'Member',
      type: 'member',
      confidence: response.confidence || null,
      bbox: response.bbox || [],
      attendanceStatus: response.attendance_marked ? 'confirmed' : 'detecting',
      attendanceMarked: response.attendance_marked,
      lastSeen: now,
    });
  } else if (response.type === 'TEMP' && response.temp_user_id) {
    // Temp users only show scanning overlay - no attendance entry
    if (response.bbox && response.bbox.length >= 4) {
      scanningBboxes.push(response.bbox);
    }
  }

  // Handle legacy format: faces array
  if (response.faces && Array.isArray(response.faces)) {
    for (const face of response.faces) {
      // Only create TrackedFace for recognized members
      if (face.recognized && face.user_id) {
        const bbox = face.bbox || [];
        if (bbox.length >= 4 && bbox.every(v => typeof v === 'number')) {
          faces.push({
            id: face.user_id,
            name: face.name || 'Member',
            type: 'member',
            confidence: face.confidence || null,
            bbox: bbox.slice(0, 4),
            attendanceStatus: face.attendance_status === 'marked' || face.attendance_status === 'already_marked' 
              ? 'confirmed' 
              : 'detecting',
            attendanceMarked: face.attendance_status === 'marked' || face.attendance_status === 'already_marked',
            lastSeen: now,
          });
        }
      } else {
        // Unrecognized face - add to scanning overlay only
        const bbox = face.bbox || [];
        if (bbox.length >= 4 && bbox.every(v => typeof v === 'number')) {
          scanningBboxes.push(bbox.slice(0, 4));
        }
      }
    }
  }

  return { faces, scanningBboxes };
};

export const useFaceRecognition = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tracked faces = only recognized members (from backend)
  const [trackedFaces, setTrackedFaces] = useState<TrackedFace[]>([]);
  // Scanning bboxes = unrecognized faces (overlay only)
  const [scanningBboxes, setScanningBboxes] = useState<number[][]>([]);
  const lastUpdateRef = useRef<number>(Date.now());

  /**
   * Check if capture should be paused based on confirmed attendance
   */
  const shouldPauseCapture = useCallback((): boolean => {
    return trackedFaces.some(face => face.attendanceStatus === 'confirmed');
  }, [trackedFaces]);

  /**
   * Clear all tracked faces and scanning bboxes
   */
  const clearFaces = useCallback(() => {
    setTrackedFaces([]);
    setScanningBboxes([]);
    lastUpdateRef.current = Date.now();
  }, []);

  /**
   * Remove stale faces not seen recently
   */
  const pruneStalefaces = useCallback(() => {
    const now = Date.now();
    setTrackedFaces(prev => 
      prev.filter(face => now - face.lastSeen < FACE_TIMEOUT_MS)
    );
  }, []);

  /**
   * Send frame to Django for recognition - NO local processing
   * Frontend trusts backend response completely
   */
  const recognizeFace = useCallback(async (
    imageBase64: string, 
    organizationId?: string
  ): Promise<{ 
    success: boolean; 
    faces: TrackedFace[]; 
    scanningBboxes: number[][];
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
          mode: 'RECOGNIZE',
          organization_id: organizationId,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const response = data as DjangoResponse;
      
      if (!response.success) {
        const msg = response.error || response.message || 'Recognition failed';
        setError(msg);
        return { 
          success: false, 
          faces: trackedFaces, 
          scanningBboxes,
          shouldPause: false,
          error: msg 
        };
      }

      // Parse backend response - trust it completely
      const { faces: newFaces, scanningBboxes: newScanningBboxes } = parseDjangoResponse(response);

      // Update state based on backend response
      if (response.code === 'NO_FACE') {
        setTrackedFaces([]);
        setScanningBboxes([]);
        return { success: true, faces: [], scanningBboxes: [], shouldPause: false };
      }

      setScanningBboxes(newScanningBboxes);

      if (newFaces.length > 0) {
        setTrackedFaces(newFaces);
        lastUpdateRef.current = Date.now();
        
        // Pause only for confirmed attendance (backend marked it)
        const shouldPause = newFaces.some(f => f.attendanceMarked);
        
        return { success: true, faces: newFaces, scanningBboxes: newScanningBboxes, shouldPause };
      }

      // Faces detected but not recognized - show scanning overlay
      if (newScanningBboxes.length > 0) {
        return { success: true, faces: [], scanningBboxes: newScanningBboxes, shouldPause: false };
      }

      setTrackedFaces([]);
      setScanningBboxes([]);
      return { success: true, faces: [], scanningBboxes: [], shouldPause: false };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Recognition failed';
      setError(errorMessage);
      return { success: false, faces: trackedFaces, scanningBboxes, shouldPause: false, error: errorMessage };
    } finally {
      setIsProcessing(false);
    }
  }, [trackedFaces, scanningBboxes]);

  /**
   * Register/enroll face via Django - NO local DB writes
   */
  const registerFace = useCallback(async (
    imageBase64: string,
    userData: { user_id: string; name: string }
  ): Promise<RegistrationResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('face-recognition', {
        body: {
          action: 'enroll',
          image: imageBase64,
          mode: 'ENROLL',
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
        
        // Handle duplicate face error
        if (result.code === 'DUPLICATE_FACE' || result.error === 'duplicate_face') {
          return {
            success: false,
            error: 'duplicate_face',
            code: 'DUPLICATE_FACE',
            message: result.message || 'This face is already enrolled for another user.',
          };
        }
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      console.error('[useFaceRecognition] Registration error:', err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Health check for Django API connection
   */
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
      console.error('[useFaceRecognition] Health check error:', err);
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
    scanningBboxes,
    error,
    clearError,
    clearFaces,
    pruneStalefaces,
    shouldPauseCapture,
  };
};
