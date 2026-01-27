import { useMemo } from 'react';

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
}

interface FaceOverlayProps {
  faces: RecognizedFaceOverlay[];
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
}

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

        const isMember = face.type === 'member';
        const borderColor = isMember ? 'border-green-500' : 'border-yellow-500';
        const bgColor = isMember ? 'bg-green-500' : 'bg-yellow-500';
        const cornerLength = 30;
        const cornerThickness = 5;

        return (
          <div key={index}>
            {/* Main bounding box (subtle border) */}
            <div
              className={`absolute border ${borderColor} border-opacity-30`}
              style={{
                left: face.x,
                top: face.y,
                width: face.width,
                height: face.height,
              }}
            />
            
            {/* Corner rectangles - cvzone.cornerRect style (l=30, t=5, rt=1) */}
            {/* Top-left corner */}
            <div
              className={`absolute ${bgColor}`}
              style={{
                left: face.x,
                top: face.y,
                width: cornerLength,
                height: cornerThickness,
              }}
            />
            <div
              className={`absolute ${bgColor}`}
              style={{
                left: face.x,
                top: face.y,
                width: cornerThickness,
                height: cornerLength,
              }}
            />
            
            {/* Top-right corner */}
            <div
              className={`absolute ${bgColor}`}
              style={{
                left: face.x + face.width - cornerLength,
                top: face.y,
                width: cornerLength,
                height: cornerThickness,
              }}
            />
            <div
              className={`absolute ${bgColor}`}
              style={{
                left: face.x + face.width - cornerThickness,
                top: face.y,
                width: cornerThickness,
                height: cornerLength,
              }}
            />
            
            {/* Bottom-left corner */}
            <div
              className={`absolute ${bgColor}`}
              style={{
                left: face.x,
                top: face.y + face.height - cornerThickness,
                width: cornerLength,
                height: cornerThickness,
              }}
            />
            <div
              className={`absolute ${bgColor}`}
              style={{
                left: face.x,
                top: face.y + face.height - cornerLength,
                width: cornerThickness,
                height: cornerLength,
              }}
            />
            
            {/* Bottom-right corner */}
            <div
              className={`absolute ${bgColor}`}
              style={{
                left: face.x + face.width - cornerLength,
                top: face.y + face.height - cornerThickness,
                width: cornerLength,
                height: cornerThickness,
              }}
            />
            <div
              className={`absolute ${bgColor}`}
              style={{
                left: face.x + face.width - cornerThickness,
                top: face.y + face.height - cornerLength,
                width: cornerThickness,
                height: cornerLength,
              }}
            />

            {/* Name label */}
            {face.name && (
              <div
                className={`absolute ${bgColor} text-white text-xs px-2 py-1 rounded-b-md font-medium`}
                style={{
                  left: face.x,
                  top: face.y + face.height,
                  maxWidth: face.width,
                }}
              >
                <span className="truncate block">{face.name}</span>
                {face.confidence && (
                  <span className="text-white/80 text-[10px]">
                    {Math.round(face.confidence * 100)}%
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FaceOverlay;
