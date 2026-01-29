import { useState, useEffect } from 'react';
import { AttendanceStatus } from '@/hooks/useFaceRecognition';

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FaceOverlayData {
  bbox: number[]; // [x1, y1, x2, y2] from cvzone.cornerRect
  name?: string;
  attendanceStatus: AttendanceStatus;
  confidence?: number | null;
}

interface FaceOverlayProps {
  faces: FaceOverlayData[];
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
}

// Random colors for detection animation
const DETECTION_COLORS = [
  'hsl(var(--primary))',
  'hsl(280, 70%, 60%)', // Purple
  'hsl(200, 80%, 55%)', // Blue
  'hsl(35, 90%, 55%)', // Orange
  'hsl(320, 70%, 55%)', // Pink
  'hsl(170, 70%, 45%)', // Teal
  'hsl(45, 90%, 55%)', // Yellow
];

const SUCCESS_COLOR = 'hsl(142, 76%, 45%)'; // Green for confirmed

/**
 * Converts cvzone.cornerRect bounding box format [x1, y1, x2, y2] to position/size
 * cvzone.cornerRect uses: x1, y1, x2, y2 = bbox | w, h = x2 - x1, y2 - y1
 */
const parseBoundingBox = (bbox: number[]): BoundingBox | null => {
  if (!bbox || !Array.isArray(bbox) || bbox.length < 4) return null;
  
  // Validate all values are valid numbers
  const values = bbox.slice(0, 4);
  if (!values.every(v => typeof v === 'number' && !isNaN(v) && isFinite(v))) {
    return null;
  }
  
  const [x1, y1, x2, y2] = values;
  
  // Validate box has positive dimensions (at least 1 pixel)
  if (x2 <= x1 || y2 <= y1) return null;
  
  // Additional guard: ensure minimum reasonable size
  const width = x2 - x1;
  const height = y2 - y1;
  if (width < 10 || height < 10) return null;
  
  return { x1, y1, x2, y2 };
};

/**
 * Generate a stable key for a face based on its bbox dimensions (x, y, width, height)
 * This ensures each unique face position gets a unique key without accumulation
 */
const generateFaceKey = (bbox: number[]): string => {
  if (!bbox || bbox.length < 4) return `face-invalid-${Math.random()}`;
  const [x1, y1, x2, y2] = bbox;
  const w = x2 - x1;
  const h = y2 - y1;
  // Round to nearest 5px for slight position stability while maintaining uniqueness
  const rx = Math.round(x1 / 5) * 5;
  const ry = Math.round(y1 / 5) * 5;
  const rw = Math.round(w / 5) * 5;
  const rh = Math.round(h / 5) * 5;
  return `face-${rx}-${ry}-${rw}-${rh}`;
};

const FaceOverlay = ({ faces, videoWidth, videoHeight, containerWidth, containerHeight }: FaceOverlayProps) => {
  const [colorIndex, setColorIndex] = useState(0);

  // Animate color change during detection - 150ms cycle
  useEffect(() => {
    const hasDetectingFaces = faces.some(
      f => f.attendanceStatus === 'detecting' || f.attendanceStatus === undefined
    );

    if (hasDetectingFaces) {
      const interval = setInterval(() => {
        setColorIndex(prev => (prev + 1) % DETECTION_COLORS.length);
      }, 150); // Fast color cycling every 150ms
      return () => clearInterval(interval);
    }
  }, [faces]);

  // Calculate scale factors - recalculate on every render
  const scaleX = containerWidth > 0 && videoWidth > 0 ? containerWidth / videoWidth : 1;
  const scaleY = containerHeight > 0 && videoHeight > 0 ? containerHeight / videoHeight : 1;

  // Early return if dimensions are invalid
  if (videoWidth === 0 || videoHeight === 0 || !faces || faces.length === 0) return null;

  // Process faces - filter invalid and scale
  const validFaces = faces
    .filter(face => face && typeof face === 'object' && face.bbox)
    .map((face, index) => {
      const box = parseBoundingBox(face.bbox);
      if (!box) return null;

      // Calculate width and height from x1,y1,x2,y2 (cvzone format)
      const w = box.x2 - box.x1;
      const h = box.y2 - box.y1;

      // Scale to container size - recalculated fresh each render
      const scaledX = box.x1 * scaleX;
      const scaledY = box.y1 * scaleY;
      const scaledW = w * scaleX;
      const scaledH = h * scaleY;

      // Cap corner length to 25% of face dimensions to prevent overlap
      const maxCornerByWidth = scaledW * 0.25;
      const maxCornerByHeight = scaledH * 0.25;
      const cornerLength = Math.min(30, maxCornerByWidth, maxCornerByHeight);

      return {
        ...face,
        key: generateFaceKey(face.bbox),
        x: scaledX,
        y: scaledY,
        width: scaledW,
        height: scaledH,
        cornerLength,
      };
    })
    .filter((face): face is NonNullable<typeof face> => face !== null);

  if (validFaces.length === 0) return null;

  const cornerThickness = 4;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {validFaces.map((face) => {
        // Determine color and effects based on attendance status
        let currentColor: string;
        let showGlow = false;
        let labelText = '';
        let showLabel = false;

        const status = face.attendanceStatus;

        // Check for success states: confirmed (recognized member with attendance)
        if (status === 'confirmed') {
          currentColor = SUCCESS_COLOR;
          showGlow = true;
          labelText = face.name || 'Confirmed';
          showLabel = true;
        } else {
          // Detecting or undefined - use animated colors, no glow
          currentColor = DETECTION_COLORS[colorIndex];
          showGlow = false;
          showLabel = false;
        }

        const glowStyle = showGlow ? `0 0 12px ${currentColor}, 0 0 24px ${currentColor}50` : 'none';

        return (
          <div key={face.key}>
            {/* Corner rectangles - cvzone.cornerRect style - ONLY 8 divs, NO borders */}
            
            {/* Top-left corner - horizontal */}
            <div
              className="absolute"
              style={{
                left: face.x,
                top: face.y,
                width: face.cornerLength,
                height: cornerThickness,
                backgroundColor: currentColor,
                boxShadow: glowStyle,
                transition: showGlow ? 'background-color 0.2s, box-shadow 0.2s' : 'none',
              }}
            />
            {/* Top-left corner - vertical */}
            <div
              className="absolute"
              style={{
                left: face.x,
                top: face.y,
                width: cornerThickness,
                height: face.cornerLength,
                backgroundColor: currentColor,
                boxShadow: glowStyle,
                transition: showGlow ? 'background-color 0.2s, box-shadow 0.2s' : 'none',
              }}
            />
            
            {/* Top-right corner - horizontal */}
            <div
              className="absolute"
              style={{
                left: face.x + face.width - face.cornerLength,
                top: face.y,
                width: face.cornerLength,
                height: cornerThickness,
                backgroundColor: currentColor,
                boxShadow: glowStyle,
                transition: showGlow ? 'background-color 0.2s, box-shadow 0.2s' : 'none',
              }}
            />
            {/* Top-right corner - vertical */}
            <div
              className="absolute"
              style={{
                left: face.x + face.width - cornerThickness,
                top: face.y,
                width: cornerThickness,
                height: face.cornerLength,
                backgroundColor: currentColor,
                boxShadow: glowStyle,
                transition: showGlow ? 'background-color 0.2s, box-shadow 0.2s' : 'none',
              }}
            />
            
            {/* Bottom-left corner - horizontal */}
            <div
              className="absolute"
              style={{
                left: face.x,
                top: face.y + face.height - cornerThickness,
                width: face.cornerLength,
                height: cornerThickness,
                backgroundColor: currentColor,
                boxShadow: glowStyle,
                transition: showGlow ? 'background-color 0.2s, box-shadow 0.2s' : 'none',
              }}
            />
            {/* Bottom-left corner - vertical */}
            <div
              className="absolute"
              style={{
                left: face.x,
                top: face.y + face.height - face.cornerLength,
                width: cornerThickness,
                height: face.cornerLength,
                backgroundColor: currentColor,
                boxShadow: glowStyle,
                transition: showGlow ? 'background-color 0.2s, box-shadow 0.2s' : 'none',
              }}
            />
            
            {/* Bottom-right corner - horizontal */}
            <div
              className="absolute"
              style={{
                left: face.x + face.width - face.cornerLength,
                top: face.y + face.height - cornerThickness,
                width: face.cornerLength,
                height: cornerThickness,
                backgroundColor: currentColor,
                boxShadow: glowStyle,
                transition: showGlow ? 'background-color 0.2s, box-shadow 0.2s' : 'none',
              }}
            />
            {/* Bottom-right corner - vertical */}
            <div
              className="absolute"
              style={{
                left: face.x + face.width - cornerThickness,
                top: face.y + face.height - face.cornerLength,
                width: cornerThickness,
                height: face.cornerLength,
                backgroundColor: currentColor,
                boxShadow: glowStyle,
                transition: showGlow ? 'background-color 0.2s, box-shadow 0.2s' : 'none',
              }}
            />

            {/* Name/status label - only show when confirmed or visitor */}
            {showLabel && (
              <div
                className="absolute text-white text-xs px-2 py-1 rounded-b-md font-medium whitespace-nowrap"
                style={{
                  left: face.x,
                  top: face.y + face.height + 4,
                  maxWidth: face.width,
                  backgroundColor: currentColor,
                  boxShadow: `0 2px 8px ${currentColor}50`,
                }}
              >
                <span className="truncate block">{labelText}</span>
                {status === 'confirmed' && face.confidence != null && (
                  <span className="text-white/80 text-[10px]">
                    {Math.round(face.confidence * 100)}%
                  </span>
                )}
              </div>
            )}

            {/* Detecting indicator - pulsing animation */}
            {(status === 'detecting' || status === undefined) && (
              <div
                className="absolute text-white text-xs px-2 py-1 rounded-md font-medium animate-pulse whitespace-nowrap"
                style={{
                  left: face.x + face.width / 2,
                  top: face.y + face.height + 4,
                  transform: 'translateX(-50%)',
                  backgroundColor: currentColor,
                }}
              >
                Detecting...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FaceOverlay;
