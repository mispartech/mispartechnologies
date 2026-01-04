import React, { useState, useEffect, useRef } from 'react';
import { Camera, Sun, AlertCircle, CheckCircle2, XCircle, Loader2, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DemoState = 'idle' | 'aligning' | 'lighting' | 'processing' | 'success' | 'retry';

interface FeedbackIndicator {
  label: string;
  status: 'good' | 'warning' | 'error';
  icon: React.ReactNode;
}

const InteractiveFaceDemo = ({ onComplete }: { onComplete: () => void }) => {
  const [demoState, setDemoState] = useState<DemoState>('idle');
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [facePosition, setFacePosition] = useState({ x: 50, y: 50 });
  const [showSuccess, setShowSuccess] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const startDemo = () => {
    setIsSimulating(true);
    setDemoState('aligning');
    setConfidenceScore(0);
    
    // Simulate face alignment
    setTimeout(() => {
      setDemoState('lighting');
      setConfidenceScore(30);
    }, 1500);

    // Simulate lighting check
    setTimeout(() => {
      setDemoState('processing');
      setConfidenceScore(60);
    }, 3000);

    // Simulate processing with confidence building
    setTimeout(() => setConfidenceScore(75), 3500);
    setTimeout(() => setConfidenceScore(88), 4000);
    setTimeout(() => setConfidenceScore(95), 4500);
    
    // Success
    setTimeout(() => {
      setDemoState('success');
      setConfidenceScore(98.7);
      setShowSuccess(true);
    }, 5000);
  };

  const resetDemo = () => {
    setDemoState('idle');
    setIsSimulating(false);
    setConfidenceScore(0);
    setShowSuccess(false);
  };

  // Simulate face movement
  useEffect(() => {
    if (isSimulating && demoState !== 'success') {
      const interval = setInterval(() => {
        setFacePosition({
          x: 50 + (Math.random() - 0.5) * (demoState === 'aligning' ? 30 : 10),
          y: 50 + (Math.random() - 0.5) * (demoState === 'aligning' ? 20 : 5),
        });
      }, 200);
      return () => clearInterval(interval);
    } else if (demoState === 'success') {
      setFacePosition({ x: 50, y: 50 });
    }
  }, [isSimulating, demoState]);

  const getGuidanceText = () => {
    switch (demoState) {
      case 'idle': return 'Click to start face demo';
      case 'aligning': return 'Center your face in the frame';
      case 'lighting': return 'Good lighting detected ✓';
      case 'processing': return 'Processing…';
      case 'success': return 'Identity verified!';
      case 'retry': return 'Try again';
      default: return '';
    }
  };

  const getFeedbackIndicators = (): FeedbackIndicator[] => {
    const getStatus = (threshold: DemoState[]) => {
      if (threshold.includes(demoState)) return 'good';
      if (demoState === 'idle') return 'warning';
      return 'warning';
    };

    return [
      {
        label: 'Face Position',
        status: ['lighting', 'processing', 'success'].includes(demoState) ? 'good' : 
                demoState === 'aligning' ? 'warning' : 'error',
        icon: <Focus size={16} />
      },
      {
        label: 'Lighting',
        status: ['processing', 'success'].includes(demoState) ? 'good' : 
                ['lighting'].includes(demoState) ? 'warning' : 'error',
        icon: <Sun size={16} />
      },
      {
        label: 'Focus',
        status: ['success'].includes(demoState) ? 'good' : 
                ['processing'].includes(demoState) ? 'warning' : 'error',
        icon: <Camera size={16} />
      }
    ];
  };

  const statusColors = {
    good: 'bg-mint text-mint',
    warning: 'bg-amber-500 text-amber-500',
    error: 'bg-red-500 text-red-500'
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Camera Feed Section */}
      <div className="bg-charcoal rounded-2xl p-4 shadow-2xl mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isSimulating ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground'}`} />
            <span className="text-xs text-white/60 font-mono">LIVE DEMO</span>
          </div>
          <span className="text-xs text-white/40 font-mono">
            {new Date().toLocaleTimeString()}
          </span>
        </div>

        {/* Camera viewport */}
        <div 
          ref={frameRef}
          className="relative aspect-video bg-gradient-to-br from-charcoal-light to-charcoal rounded-xl overflow-hidden cursor-pointer"
          onClick={!isSimulating ? startDemo : undefined}
        >
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }} />
          </div>

          {/* Face alignment frame */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`relative w-40 h-52 transition-all duration-300 ${
              demoState === 'success' ? 'border-mint' : 
              demoState === 'processing' ? 'border-primary' :
              demoState === 'aligning' ? 'border-amber-500' : 'border-white/30'
            }`}>
              {/* Corner brackets */}
              {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
                <div
                  key={corner}
                  className={`absolute w-8 h-8 transition-colors duration-300 ${
                    demoState === 'success' ? 'border-mint' :
                    demoState === 'processing' ? 'border-primary' :
                    demoState === 'aligning' ? 'border-amber-500' : 'border-white/30'
                  } ${corner.includes('top') ? 'border-t-2' : 'border-b-2'} ${corner.includes('left') ? 'border-l-2' : 'border-r-2'}`}
                  style={{
                    top: corner.includes('top') ? '-1px' : 'auto',
                    bottom: corner.includes('bottom') ? '-1px' : 'auto',
                    left: corner.includes('left') ? '-1px' : 'auto',
                    right: corner.includes('right') ? '-1px' : 'auto',
                  }}
                />
              ))}

              {/* Animated face silhouette */}
              {isSimulating && (
                <div 
                  className="absolute inset-4 transition-all duration-200"
                  style={{
                    transform: `translate(${(facePosition.x - 50) * 0.5}px, ${(facePosition.y - 50) * 0.5}px)`
                  }}
                >
                  <svg viewBox="0 0 100 120" className="w-full h-full">
                    <ellipse 
                      cx="50" cy="50" rx="38" ry="45" 
                      fill="none" 
                      stroke={demoState === 'success' ? '#4fd1c5' : demoState === 'processing' ? '#6366f1' : '#f59e0b'} 
                      strokeWidth="2"
                      className="transition-all duration-300"
                    />
                    {/* Eyes */}
                    <circle cx="35" cy="42" r="4" fill={demoState === 'success' ? '#4fd1c5' : '#f59e0b'} className="transition-colors duration-300" />
                    <circle cx="65" cy="42" r="4" fill={demoState === 'success' ? '#4fd1c5' : '#f59e0b'} className="transition-colors duration-300" />
                    {/* Nose */}
                    <ellipse cx="50" cy="58" rx="6" ry="4" fill={demoState === 'success' ? '#4fd1c5' : '#f59e0b'} className="transition-colors duration-300 opacity-60" />
                    {/* Mouth */}
                    <path d="M 35 72 Q 50 82 65 72" fill="none" stroke={demoState === 'success' ? '#4fd1c5' : '#f59e0b'} strokeWidth="2" className="transition-colors duration-300" />
                  </svg>
                </div>
              )}

              {/* Scanning animation */}
              {demoState === 'processing' && (
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
              )}
            </div>
          </div>

          {/* Idle state overlay */}
          {!isSimulating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="text-center">
                <Camera size={48} className="mx-auto mb-3 text-white/60" />
                <p className="text-white/80 font-medium">Click to Start Demo</p>
                <p className="text-white/50 text-sm mt-1">Experience face recognition</p>
              </div>
            </div>
          )}

          {/* Success overlay */}
          {showSuccess && (
            <div className="absolute inset-0 flex items-center justify-center bg-mint/10 animate-fade-in">
              <div className="text-center">
                <CheckCircle2 size={64} className="mx-auto mb-3 text-mint animate-scale-in" />
                <p className="text-mint font-bold text-xl">Identity Verified!</p>
                <p className="text-white/60 text-sm mt-1">Attendance marked at {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Guidance text */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10">
            {demoState === 'processing' && <Loader2 size={16} className="text-primary animate-spin" />}
            {demoState === 'success' && <CheckCircle2 size={16} className="text-mint" />}
            {demoState === 'aligning' && <AlertCircle size={16} className="text-amber-500" />}
            <span className="text-white/80 text-sm font-medium">{getGuidanceText()}</span>
          </div>
        </div>
      </div>

      {/* Feedback Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {getFeedbackIndicators().map((indicator, index) => (
          <div 
            key={index}
            className={`p-3 rounded-lg border transition-all duration-300 ${
              indicator.status === 'good' ? 'border-mint bg-mint/5' :
              indicator.status === 'warning' ? 'border-amber-500 bg-amber-500/5' :
              'border-red-500/30 bg-red-500/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`${statusColors[indicator.status].split(' ')[1]}`}>
                {indicator.icon}
              </div>
              <span className="text-sm font-medium">{indicator.label}</span>
            </div>
            <div className={`text-xs ${
              indicator.status === 'good' ? 'text-mint' :
              indicator.status === 'warning' ? 'text-amber-500' :
              'text-red-500'
            }`}>
              {indicator.status === 'good' ? 'Good' : indicator.status === 'warning' ? 'Adjusting...' : 'Check'}
            </div>
          </div>
        ))}
      </div>

      {/* Confidence Score */}
      <div className="bg-muted/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Confidence Score</span>
          <span className={`text-lg font-bold ${
            confidenceScore >= 95 ? 'text-mint' :
            confidenceScore >= 70 ? 'text-primary' :
            confidenceScore >= 40 ? 'text-amber-500' :
            'text-muted-foreground'
          }`}>
            {confidenceScore.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              confidenceScore >= 95 ? 'bg-mint' :
              confidenceScore >= 70 ? 'bg-primary' :
              confidenceScore >= 40 ? 'bg-amber-500' :
              'bg-muted-foreground'
            }`}
            style={{ width: `${confidenceScore}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>0%</span>
          <span>Processing threshold: 95%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        {showSuccess ? (
          <>
            <Button onClick={onComplete} className="bg-primary hover:bg-primary/90">
              Continue to Get Updates
            </Button>
            <Button variant="outline" onClick={resetDemo}>
              Try Again
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={resetDemo} disabled={!isSimulating}>
            Reset Demo
          </Button>
        )}
      </div>
    </div>
  );
};

export default InteractiveFaceDemo;
