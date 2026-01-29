import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Backend response codes
type ResponseCode = 
  | 'NO_FACE' 
  | 'FACE_UNSTABLE' 
  | 'FACES_DETECTED'
  | 'FACE_RECOGNIZED' 
  | 'TEMP_USER' 
  | 'ALREADY_MARKED'
  | 'ERROR';

// Attendance status for each face
// 'detecting' = scanning animation, 'confirmed' = recognized member with attendance
export type AttendanceStatus = 'detecting' | 'confirmed';

export interface TrackedFace {
  id: string; // user_id for recognized members only
  name: string;
  type: 'member'; // Only members create attendance - no visitors
  confidence: number | null;
  bbox: number[];
  attendanceStatus: AttendanceStatus;
  backendStatus?: string; // 'marked' | 'already_marked' | 'error'
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
 * Returns null if the face is invalid, unrecognized, or unstable
 * ONLY returns TrackedFace for recognized members (recognized === true)
 */
const parseRawFace = (raw: unknown, index: number): TrackedFace | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const face = raw as RawFace & { recognized?: boolean; user_type?: string; unstable?: boolean };

  // CRITICAL: Only process recognized faces with a valid user_id
  // Unrecognized, unknown, or unstable faces should NOT create attendance entries
  if (!face.recognized || !face.user_id) {
    // Return null - this face should only show scanning overlay, not attendance entry
    return null;
  }

  // Validate bbox - must be array with at least 4 numbers
  if (!face.bbox || !Array.isArray(face.bbox) || face.bbox.length < 4) {
    return null;
  }

  // Validate bbox values are numbers
  const bboxValid = face.bbox.slice(0, 4).every(v => typeof v === 'number' && !isNaN(v));
  if (!bboxValid) {
    return null;
  }

  // Determine attendance status based on backend response
  let attendanceStatus: AttendanceStatus = 'detecting';
  if (face.attendance_status === 'marked' || face.attendance_status === 'already_marked') {
    attendanceStatus = 'confirmed';
  }

  return {
    id: face.user_id,
    name: face.name || 'Unknown Member',
    type: 'member',
    confidence: typeof face.confidence === 'number' ? face.confidence : null,
    bbox: face.bbox.slice(0, 4),
    attendanceStatus,
    backendStatus: face.attendance_status,
    lastSeen: Date.now(),
  };
};

/**
 * Extract bbox data for scanning overlay from unrecognized faces
 * Returns bbox arrays for faces that should show scanning animation only
 */
const extractScanningBboxes = (faces: unknown[]): number[][] => {
  const bboxes: number[][] = [];
  
  for (const raw of faces) {
    if (!raw || typeof raw !== 'object') continue;
    
    const face = raw as RawFace & { recognized?: boolean };
    
    // Only extract bbox for unrecognized faces (for scanning overlay)
    if (face.recognized === true) continue; // Skip recognized - handled by parseRawFace
    
    if (face.bbox && Array.isArray(face.bbox) && face.bbox.length >= 4) {
      const bboxValid = face.bbox.slice(0, 4).every(v => typeof v === 'number' && !isNaN(v));
      if (bboxValid) {
        bboxes.push(face.bbox.slice(0, 4));
      }
    }
  }
  
  return bboxes;
};

/**
 * Interpret backend response code and determine how to update face state
 * Only creates TrackedFace entries for recognized members
 * Unrecognized/unstable faces return scanning bboxes for overlay only
 */
const interpretResponseCode = (result: RecognitionResult): {
  shouldClearFaces: boolean;
  shouldKeepDetecting: boolean;
  faces: TrackedFace[];
  scanningBboxes: number[][]; // Bboxes for scanning overlay (unrecognized faces)
} => {
  const code = result.code;
  
  // Parse recognized faces only (creates attendance entries)
  const parsedFaces: TrackedFace[] = [];
  // Extract bboxes for scanning overlay (unrecognized/unstable faces)
  let scanningBboxes: number[][] = [];
  
  if (result.faces && Array.isArray(result.faces)) {
    for (let i = 0; i < result.faces.length; i++) {
      const parsed = parseRawFace(result.faces[i], i);
      if (parsed) {
        parsedFaces.push(parsed);
      }
    }
    // Get bboxes for unrecognized faces (scanning overlay only)
    scanningBboxes = extractScanningBboxes(result.faces);
  }

  switch (code) {
    case 'NO_FACE':
      return { shouldClearFaces: true, shouldKeepDetecting: false, faces: [], scanningBboxes: [] };
    
    case 'FACE_UNSTABLE':
    case 'FACES_DETECTED':
      // Face detected but not recognized - show scanning overlay only
      // Do NOT create attendance entries for unstable/unrecognized faces
      return { 
        shouldClearFaces: false, 
        shouldKeepDetecting: true, 
        faces: parsedFaces, // Only recognized faces
        scanningBboxes, // Unrecognized faces for scanning overlay
      };
    
    case 'FACE_RECOGNIZED':
      return { 
        shouldClearFaces: false, 
        shouldKeepDetecting: false, 
        faces: parsedFaces.map(f => ({ ...f, attendanceStatus: 'confirmed' as AttendanceStatus })),
        scanningBboxes: [],
      };
    
    case 'ALREADY_MARKED':
      return { 
        shouldClearFaces: false, 
        shouldKeepDetecting: false, 
        faces: parsedFaces.map(f => ({ ...f, attendanceStatus: 'confirmed' as AttendanceStatus })),
        scanningBboxes: [],
      };
    
    // TEMP_USER is disabled - do not create visitor entries
    case 'TEMP_USER':
      // Ignore temp users - just show scanning overlay
      return { 
        shouldClearFaces: false, 
        shouldKeepDetecting: true, 
        faces: [], // No attendance entry
        scanningBboxes,
      };
    
    default:
      // Legacy handling - only process recognized faces
      if (parsedFaces.length > 0) {
        return { shouldClearFaces: false, shouldKeepDetecting: false, faces: parsedFaces, scanningBboxes: [] };
      }
      return { shouldClearFaces: false, shouldKeepDetecting: true, faces: [], scanningBboxes };
  }
};

export const useFaceRecognition = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tracked faces = only recognized members with attendance entries
  const [trackedFaces, setTrackedFaces] = useState<TrackedFace[]>([]);
  // Scanning bboxes = unrecognized/unstable faces (overlay only, no attendance)
  const [scanningBboxes, setScanningBboxes] = useState<number[][]>([]);
  const lastUpdateRef = useRef<number>(Date.now());

  /**
   * Check if capture should be paused based on current face state
   * Only pause for confirmed attendance (not for scanning)
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
        return { 
          success: false, 
          faces: trackedFaces, 
          scanningBboxes,
          shouldPause: false,
          error: msg 
        };
      }

      // Interpret response - only recognized faces become TrackedFaces
      // Unrecognized faces only provide bboxes for scanning overlay
      const { 
        shouldClearFaces, 
        shouldKeepDetecting, 
        faces: newFaces,
        scanningBboxes: newScanningBboxes 
      } = interpretResponseCode(result);
      
      if (shouldClearFaces) {
        setTrackedFaces([]);
        setScanningBboxes([]);
        return { success: true, faces: [], scanningBboxes: [], shouldPause: false };
      }

      // Update scanning bboxes for unrecognized faces (overlay only)
      setScanningBboxes(newScanningBboxes);

      if (newFaces.length > 0) {
        // Only recognized members create attendance entries
        setTrackedFaces(newFaces);
        lastUpdateRef.current = Date.now();
        
        // Only pause for confirmed attendance
        const shouldPause = newFaces.some(f => f.attendanceStatus === 'confirmed');
        
        return { success: true, faces: newFaces, scanningBboxes: newScanningBboxes, shouldPause };
      }

      // No recognized faces - keep scanning overlay active if detecting
      if (shouldKeepDetecting) {
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
    scanningBboxes, // Bboxes for scanning overlay (unrecognized faces)
    error,
    clearError,
    clearFaces,
    pruneStalefaces,
    shouldPauseCapture,
  };
};
