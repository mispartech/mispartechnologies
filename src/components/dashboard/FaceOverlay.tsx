import { useMemo, useState, useEffect } from 'react';

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface RecognizedFaceOverlay {
  bbox: number[]; // [x1, y1, x2, y2] from cvzone.cornerRect
  name?: string;
  type: 'member' | 'visitor';
  confidence?: number | null;
  attendanceStatus?: string; // 'detecting' | 'marked' | 'already_marked' | 'recorded' or others
}

interface FaceOverlayProps {
  faces: RecognizedFaceOverlay[];
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

const SUCCESS_COLOR = 'hsl(142, 76%, 45%)'; // Green for confirmed attendance

/**
 * Converts cvzone.cornerRect bounding box format [x1, y1, x2, y2] to position/size
 * cvzone.cornerRect uses: x1, y1, x2, y2 = bbox | w, h = x2 - x1, y2 - y1
 */
const parseBoundingBox = (bbox: number[]): BoundingBox | null => {
  if (!bbox || bbox.length < 4) return null;
  
  const [x1, y1, x2, y2] = bbox;
  return { x1, y1, x2, y2 };
};

const FaceOverlay = ({ faces, videoWidth, videoHeight, containerWidth, containerHeight }: FaceOverlayProps) => {
  const [colorIndex, setColorIndex] = useState(0);

  // Animate color change during detection
  useEffect(() => {
    const hasDetectingFaces = faces.some(
      f => !f.attendanceStatus || f.attendanceStatus === 'detecting'
    );

    if (hasDetectingFaces) {
      const interval = setInterval(() => {
        setColorIndex(prev => (prev + 1) % DETECTION_COLORS.length);
      }, 150); // Fast color cycling
      return () => clearInterval(interval);
    }
  }, [faces]);

  // Calculate scale factors
  const scaleX = containerWidth / videoWidth;
  const scaleY = containerHeight / videoHeight;

  const scaledFaces = useMemo(() => {
    return faces.map((face) => {
      const box = parseBoundingBox(face.bbox);
      if (!box) return null;

      // Calculate width and height from x1,y1,x2,y2 (cvzone format)
      const w = box.x2 - box.x1;
      const h = box.y2 - box.y1;

      // Scale to container size
      const scaledX = box.x1 * scaleX;
      const scaledY = box.y1 * scaleY;
      const scaledW = w * scaleX;
      const scaledH = h * scaleY;

      return {
        ...face,
        x: scaledX,
        y: scaledY,
        width: scaledW,
        height: scaledH,
      };
    }).filter(Boolean);
  }, [faces, scaleX, scaleY]);

  if (videoWidth === 0 || videoHeight === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {scaledFaces.map((face, index) => {
        if (!face) return null;

        // Determine color based on attendance status
        const isConfirmed = face.attendanceStatus === 'marked' || 
                           face.attendanceStatus === 'already_marked' || 
                           face.attendanceStatus === 'recorded';
        
        const currentColor = isConfirmed 
          ? SUCCESS_COLOR 
          : DETECTION_COLORS[colorIndex];

        const cornerLength = Math.min(30, face.width * 0.2, face.height * 0.2);
        const cornerThickness = 4;

        return (
          <div key={index}>
            {/* Corner rectangles - cvzone.cornerRect style (l=30, t=5) - NO border rectangle */}
            
            {/* Top-left corner */}
            <div
              className="absolute transition-colors duration-100"
              style={{
                left: face.x,
                top: face.y,
                width: cornerLength,
                height: cornerThickness,
                backgroundColor: currentColor,
                boxShadow: isConfirmed ? `0 0 10px ${currentColor}` : 'none',
              }}
            />
            <div
              className="absolute transition-colors duration-100"
              style={{
                left: face.x,
                top: face.y,
                width: cornerThickness,
                height: cornerLength,
                backgroundColor: currentColor,
                boxShadow: isConfirmed ? `0 0 10px ${currentColor}` : 'none',
              }}
            />
            
            {/* Top-right corner */}
            <div
              className="absolute transition-colors duration-100"
              style={{
                left: face.x + face.width - cornerLength,
                top: face.y,
                width: cornerLength,
                height: cornerThickness,
                backgroundColor: currentColor,
                boxShadow: isConfirmed ? `0 0 10px ${currentColor}` : 'none',
              }}
            />
            <div
              className="absolute transition-colors duration-100"
              style={{
                left: face.x + face.width - cornerThickness,
                top: face.y,
                width: cornerThickness,
                height: cornerLength,
                backgroundColor: currentColor,
                boxShadow: isConfirmed ? `0 0 10px ${currentColor}` : 'none',
              }}
            />
            
            {/* Bottom-left corner */}
            <div
              className="absolute transition-colors duration-100"
              style={{
                left: face.x,
                top: face.y + face.height - cornerThickness,
                width: cornerLength,
                height: cornerThickness,
                backgroundColor: currentColor,
                boxShadow: isConfirmed ? `0 0 10px ${currentColor}` : 'none',
              }}
            />
            <div
              className="absolute transition-colors duration-100"
              style={{
                left: face.x,
                top: face.y + face.height - cornerLength,
                width: cornerThickness,
                height: cornerLength,
                backgroundColor: currentColor,
                boxShadow: isConfirmed ? `0 0 10px ${currentColor}` : 'none',
              }}
            />
            
            {/* Bottom-right corner */}
            <div
              className="absolute transition-colors duration-100"
              style={{
                left: face.x + face.width - cornerLength,
                top: face.y + face.height - cornerThickness,
                width: cornerLength,
                height: cornerThickness,
                backgroundColor: currentColor,
                boxShadow: isConfirmed ? `0 0 10px ${currentColor}` : 'none',
              }}
            />
            <div
              className="absolute transition-colors duration-100"
              style={{
                left: face.x + face.width - cornerThickness,
                top: face.y + face.height - cornerLength,
                width: cornerThickness,
                height: cornerLength,
                backgroundColor: currentColor,
                boxShadow: isConfirmed ? `0 0 10px ${currentColor}` : 'none',
              }}
            />

            {/* Name label - only show when confirmed */}
            {face.name && isConfirmed && (
              <div
                className="absolute text-white text-xs px-2 py-1 rounded-b-md font-medium"
                style={{
                  left: face.x,
                  top: face.y + face.height + 4,
                  maxWidth: face.width,
                  backgroundColor: SUCCESS_COLOR,
                  boxShadow: `0 2px 8px ${SUCCESS_COLOR}50`,
                }}
              >
                <span className="truncate block">{face.name}</span>
                {face.confidence != null && (
                  <span className="text-white/80 text-[10px]">
                    {Math.round(face.confidence * 100)}%
                  </span>
                )}
              </div>
            )}

            {/* Detecting indicator */}
            {!isConfirmed && (
              <div
                className="absolute text-white text-xs px-2 py-1 rounded-md font-medium animate-pulse"
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
