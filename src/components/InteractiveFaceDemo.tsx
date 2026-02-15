import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, CheckCircle2, Loader2, AlertCircle, Sun, Focus, Clock, RotateCcw, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { demoEnrollFace, demoRecognizeFace } from '@/lib/api/demoApi';
import { getDemoId, markDemoEnrolled, isDemoEnrolled, getDemoTimeRemaining } from '@/lib/demoSession';

type DemoPhase = 'enroll' | 'recognizing' | 'result';
type EnrollState = 'idle' | 'uploading' | 'processing' | 'enrolled';
type RecognizeState = 'idle' | 'camera-starting' | 'scanning' | 'matched' | 'no-match' | 'error';

const MAX_IMAGE_DIMENSION = 800;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = (height / width) * MAX_IMAGE_DIMENSION;
            width = MAX_IMAGE_DIMENSION;
          } else {
            width = (width / height) * MAX_IMAGE_DIMENSION;
            height = MAX_IMAGE_DIMENSION;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64.split(',')[1]);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  let { videoWidth: width, videoHeight: height } = video;
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = (height / width) * MAX_IMAGE_DIMENSION;
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = (width / height) * MAX_IMAGE_DIMENSION;
      height = MAX_IMAGE_DIMENSION;
    }
  }
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, width, height);
  const base64 = canvas.toDataURL('image/jpeg', 0.8);
  return base64.split(',')[1];
}

const InteractiveFaceDemo = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState<DemoPhase>(() => isDemoEnrolled() ? 'recognizing' : 'enroll');
  const [enrollState, setEnrollState] = useState<EnrollState>('idle');
  const [recognizeState, setRecognizeState] = useState<RecognizeState>('idle');
  const [enrollPreview, setEnrollPreview] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(getDemoTimeRemaining());

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognizeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const demoId = getDemoId();

  // Update time remaining
  useEffect(() => {
    if (!isDemoEnrolled()) return;
    const interval = setInterval(() => {
      setTimeRemaining(getDemoTimeRemaining());
    }, 60000);
    return () => clearInterval(interval);
  }, [phase]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (recognizeIntervalRef.current) {
      clearInterval(recognizeIntervalRef.current);
      recognizeIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // === ENROLL PHASE ===
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setEnrollState('uploading');
    
    // Show preview
    const previewUrl = URL.createObjectURL(file);
    setEnrollPreview(previewUrl);

    try {
      setEnrollState('processing');
      const imageBase64 = await compressImage(file);
      const result = await demoEnrollFace(imageBase64, demoId);

      if (result.success) {
        markDemoEnrolled();
        setEnrollState('enrolled');
        setTimeout(() => {
          setPhase('recognizing');
        }, 2000);
      } else {
        setErrorMsg(result.error || result.message || 'Enrollment failed. Please try a clearer photo.');
        setEnrollState('idle');
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setEnrollState('idle');
    }
  };

  // === RECOGNIZE PHASE ===
  const startCamera = async () => {
    setErrorMsg(null);
    setRecognizeState('camera-starting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setRecognizeState('scanning');

      // Start continuous recognition
      recognizeIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;

        const frame = captureFrame(videoRef.current);
        const result = await demoRecognizeFace(frame, demoId);

        if (result.success && result.type === 'KNOWN') {
          setConfidenceScore(result.confidence || 98);
          setMatchedName(result.name || 'Demo User');
          setRecognizeState('matched');
          stopCamera();

          setTimeout(() => {
            setPhase('result');
            onComplete();
          }, 3000);
        }
      }, 2000);
    } catch {
      setErrorMsg('Camera access denied. Please allow camera access and try again.');
      setRecognizeState('error');
    }
  };

  const resetDemo = () => {
    stopCamera();
    setRecognizeState('idle');
    setConfidenceScore(0);
    setMatchedName(null);
    setErrorMsg(null);
  };

  const resetAll = () => {
    stopCamera();
    setPhase('enroll');
    setEnrollState('idle');
    setEnrollPreview(null);
    setRecognizeState('idle');
    setConfidenceScore(0);
    setMatchedName(null);
    setErrorMsg(null);
  };

  // === RENDER HELPERS ===
  const renderEnrollPhase = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-charcoal rounded-2xl p-4 shadow-2xl mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-white/60 font-mono">STEP 1: ENROLL</span>
          </div>
          <span className="text-xs text-white/40 font-mono">7-day trial</span>
        </div>

        <div
          className="relative aspect-video bg-gradient-to-br from-charcoal-light to-charcoal rounded-xl overflow-hidden cursor-pointer flex items-center justify-center"
          onClick={() => fileInputRef.current?.click()}
        >
          {enrollPreview ? (
            <img src={enrollPreview} alt="Enrollment preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
                <Upload size={32} className="text-white/60" />
              </div>
              <p className="text-white/80 font-medium text-lg">Upload Your Photo</p>
              <p className="text-white/50 text-sm mt-2">Click to select a clear, front-facing photo of yourself</p>
              <p className="text-white/30 text-xs mt-3">Your face will be enrolled for a 7-day demo trial</p>
            </div>
          )}

          {enrollState === 'processing' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center">
                <Loader2 size={48} className="mx-auto mb-3 text-primary animate-spin" />
                <p className="text-white/80 font-medium">Enrolling your face...</p>
              </div>
            </div>
          )}

          {enrollState === 'enrolled' && (
            <div className="absolute inset-0 bg-mint/20 flex items-center justify-center animate-fade-in">
              <div className="text-center">
                <CheckCircle2 size={64} className="mx-auto mb-3 text-mint" />
                <p className="text-mint font-bold text-xl">Face Enrolled!</p>
                <p className="text-white/60 text-sm mt-1">Moving to recognition...</p>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {errorMsg && (
          <div className="mt-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-red-300 text-sm">{errorMsg}</span>
            </div>
          </div>
        )}
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Face Position', icon: <Focus size={16} />, status: enrollState === 'enrolled' ? 'good' : 'waiting' },
          { label: 'Lighting', icon: <Sun size={16} />, status: enrollState === 'enrolled' ? 'good' : 'waiting' },
          { label: 'Focus', icon: <Camera size={16} />, status: enrollState === 'enrolled' ? 'good' : 'waiting' },
        ].map((ind, i) => (
          <div key={i} className={`p-3 rounded-lg border transition-all duration-300 ${
            ind.status === 'good' ? 'border-mint bg-mint/5' : 'border-border bg-muted/30'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={ind.status === 'good' ? 'text-mint' : 'text-muted-foreground'}>{ind.icon}</div>
              <span className="text-sm font-medium">{ind.label}</span>
            </div>
            <div className={`text-xs ${ind.status === 'good' ? 'text-mint' : 'text-muted-foreground'}`}>
              {ind.status === 'good' ? 'Good' : 'Check'}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={enrollState === 'processing'}
          className="bg-primary hover:bg-primary/90"
        >
          <ImageIcon size={16} className="mr-2" />
          {enrollState === 'processing' ? 'Processing...' : 'Select Photo to Enroll'}
        </Button>
      </div>
    </div>
  );

  const renderRecognizePhase = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-charcoal rounded-2xl p-4 shadow-2xl mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${recognizeState === 'scanning' ? 'bg-red-500 animate-pulse' : recognizeState === 'matched' ? 'bg-mint' : 'bg-muted-foreground'}`} />
            <span className="text-xs text-white/60 font-mono">
              {recognizeState === 'matched' ? 'MATCHED' : 'LIVE RECOGNITION'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {timeRemaining && (
              <span className="text-xs text-white/30 font-mono">
                {timeRemaining.days}d {timeRemaining.hours}h left
              </span>
            )}
            <span className="text-xs text-white/40 font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="relative aspect-video bg-gradient-to-br from-charcoal-light to-charcoal rounded-xl overflow-hidden">
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="w-full h-full" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }} />
          </div>

          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${recognizeState === 'idle' || recognizeState === 'camera-starting' ? 'hidden' : ''}`}
            playsInline
            muted
          />

          {/* Face alignment frame overlay */}
          {(recognizeState === 'scanning' || recognizeState === 'matched') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-40 h-52">
                {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
                  <div
                    key={corner}
                    className={`absolute w-8 h-8 transition-colors duration-300 ${
                      recognizeState === 'matched' ? 'border-mint' : 'border-primary'
                    } ${corner.includes('top') ? 'border-t-2' : 'border-b-2'} ${corner.includes('left') ? 'border-l-2' : 'border-r-2'}`}
                    style={{
                      top: corner.includes('top') ? '-1px' : 'auto',
                      bottom: corner.includes('bottom') ? '-1px' : 'auto',
                      left: corner.includes('left') ? '-1px' : 'auto',
                      right: corner.includes('right') ? '-1px' : 'auto',
                    }}
                  />
                ))}

                {recognizeState === 'scanning' && (
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                )}
              </div>
            </div>
          )}

          {/* Idle overlay */}
          {(recognizeState === 'idle' || recognizeState === 'camera-starting') && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {recognizeState === 'camera-starting' ? (
                  <>
                    <Loader2 size={48} className="mx-auto mb-3 text-primary animate-spin" />
                    <p className="text-white/80 font-medium">Starting camera...</p>
                  </>
                ) : (
                  <>
                    <Camera size={48} className="mx-auto mb-3 text-white/60" />
                    <p className="text-white/80 font-medium">Click to Start Recognition</p>
                    <p className="text-white/50 text-sm mt-1">We'll verify your face against your enrollment</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Match overlay */}
          {recognizeState === 'matched' && (
            <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
              <div className="bg-mint/20 backdrop-blur-sm rounded-xl px-6 py-3 flex items-center gap-3">
                <CheckCircle2 size={24} className="text-mint" />
                <div>
                  <p className="text-mint font-bold">Identity Verified!</p>
                  <p className="text-white/60 text-xs">Confidence: {confidenceScore.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="mt-3 text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
            recognizeState === 'matched' ? 'bg-mint/20' :
            recognizeState === 'scanning' ? 'bg-primary/20' : 'bg-white/10'
          }`}>
            {recognizeState === 'scanning' && <Loader2 size={16} className="text-primary animate-spin" />}
            {recognizeState === 'matched' && <CheckCircle2 size={16} className="text-mint" />}
            {recognizeState === 'idle' && <Camera size={16} className="text-white/60" />}
            <span className={`text-sm font-medium ${
              recognizeState === 'matched' ? 'text-mint' : 'text-white/80'
            }`}>
              {recognizeState === 'idle' ? 'Ready to scan' :
               recognizeState === 'camera-starting' ? 'Starting camera...' :
               recognizeState === 'scanning' ? 'Scanning for your face...' :
               recognizeState === 'matched' ? `Matched — ${matchedName || 'Demo User'}` :
               recognizeState === 'no-match' ? 'No match found' :
               'Error'}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-400 text-sm">{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Confidence meter */}
      <div className="bg-muted/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Confidence Score</span>
          <span className={`text-lg font-bold ${
            confidenceScore >= 95 ? 'text-mint' :
            confidenceScore >= 70 ? 'text-primary' :
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
        {recognizeState === 'idle' ? (
          <Button onClick={startCamera} className="bg-primary hover:bg-primary/90">
            <Camera size={16} className="mr-2" />
            Start Face Recognition
          </Button>
        ) : recognizeState === 'matched' ? (
          <>
            <Button onClick={onComplete} className="bg-primary hover:bg-primary/90">
              Continue
            </Button>
            <Button variant="outline" onClick={resetDemo}>
              <RotateCcw size={16} className="mr-2" />
              Try Again
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={resetDemo}>
            <RotateCcw size={16} className="mr-2" />
            Reset
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={resetAll} className="text-muted-foreground">
          Re-enroll
        </Button>
      </div>
    </div>
  );

  const renderResultPhase = () => (
    <div className="max-w-2xl mx-auto text-center">
      <div className="bg-mint/10 border border-mint/30 rounded-2xl p-8 mb-6">
        <CheckCircle2 size={64} className="mx-auto mb-4 text-mint" />
        <h3 className="text-2xl font-bold text-foreground mb-2">Face Recognition Verified!</h3>
        <p className="text-muted-foreground mb-4">
          Confidence: <span className="text-mint font-bold">{confidenceScore.toFixed(1)}%</span>
        </p>
        {timeRemaining && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
            <Clock size={16} />
            <span>{timeRemaining.days} days, {timeRemaining.hours} hours remaining in your trial</span>
          </div>
        )}
      </div>
      <div className="flex gap-3 justify-center">
        <Button onClick={resetDemo} variant="outline">
          <RotateCcw size={16} className="mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {phase === 'enroll' && renderEnrollPhase()}
      {phase === 'recognizing' && renderRecognizePhase()}
      {phase === 'result' && renderResultPhase()}
    </>
  );
};

export default InteractiveFaceDemo;
