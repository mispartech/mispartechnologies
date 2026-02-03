import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, CheckCircle2, AlertCircle, Loader2, Shield, Scan } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DashboardContext {
  user: any;
  profile: any;
  session: any;
}

type EnrollmentStep = 'IDLE' | 'CAPTURING' | 'PROCESSING' | 'VERIFIED' | 'FAILED';

const FaceEnrollment = () => {
  const context = useOutletContext<DashboardContext>();
  const { user, profile } = context;
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [enrollmentStep, setEnrollmentStep] = useState<EnrollmentStep>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Progress percentage for visual feedback
  const progressMap: Record<EnrollmentStep, number> = {
    IDLE: 0,
    CAPTURING: 33,
    PROCESSING: 66,
    VERIFIED: 100,
    FAILED: 0,
  };

  // Step labels for display
  const stepLabels: Record<EnrollmentStep, string> = {
    IDLE: 'Ready to capture',
    CAPTURING: 'Capturing...',
    PROCESSING: 'Processing face data...',
    VERIFIED: 'Face Verified!',
    FAILED: 'Enrollment failed',
  };

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Unable to access camera. Please ensure camera permissions are granted.');
      setCameraActive(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Capture and process face - uses edge function to avoid CORS
  const captureAndEnroll = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !user?.id) return;

    setEnrollmentStep('CAPTURING');
    setErrorMessage(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      setEnrollmentStep('FAILED');
      setErrorMessage('Canvas context unavailable');
      return;
    }

    // Capture frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Stop camera after capture
    stopCamera();

    // Process with edge function (which forwards to Django)
    setEnrollmentStep('PROCESSING');

    try {
      const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email;
      
      // Use edge function to enroll - avoids CORS, passes through to Django
      const { data, error } = await supabase.functions.invoke('face-recognition', {
        body: {
          action: 'enroll',
          image: base64Image,
          user_data: {
            user_id: user.id,
            name: userName,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Handle duplicate face error from Django
      if (data?.code === 'DUPLICATE_FACE' || data?.error === 'duplicate_face') {
        throw new Error(data.message || 'This face appears to be already enrolled for another user.');
      }

      // Check for success - trust backend response completely
      if (data?.success && data?.embedding_saved) {
        setEnrollmentStep('VERIFIED');
        
        // Navigate to dashboard after brief success display
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        throw new Error(data?.message || data?.error || 'Face enrollment failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Enrollment error:', err);
      setEnrollmentStep('FAILED');
      setErrorMessage(err.message || 'Failed to enroll face. Please try again.');
      // Restart camera for retry
      startCamera();
    }
  }, [user, profile, stopCamera, startCamera, navigate]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Block back navigation
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      // Push current state back
      window.history.pushState(null, '', window.location.pathname);
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Verified state
  if (enrollmentStep === 'VERIFIED') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-primary/20">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Face Verified!</h2>
            <p className="text-muted-foreground">
              Your face has been successfully enrolled. Redirecting to dashboard...
            </p>
            <Progress value={100} className="h-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Card */}
      <Card className="border-primary/20">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Face Enrollment Required</CardTitle>
          <CardDescription className="text-base">
            To ensure secure attendance tracking, you must complete face enrollment before accessing the dashboard.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-primary">{stepLabels[enrollmentStep]}</span>
            </div>
            <Progress value={progressMap[enrollmentStep]} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={enrollmentStep === 'CAPTURING' ? 'text-primary font-medium' : ''}>
                Capturing
              </span>
              <span className={enrollmentStep === 'PROCESSING' ? 'text-primary font-medium' : ''}>
                Processing
              </span>
              <span className="text-muted-foreground">
                Verified
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Camera View */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Camera Feed */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            
            {/* Face Guide Overlay */}
            {cameraActive && enrollmentStep === 'IDLE' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-60 border-4 border-primary/50 rounded-full" />
              </div>
            )}

            {/* Loading States */}
            {enrollmentStep === 'CAPTURING' && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                <Scan className="h-16 w-16 text-primary animate-pulse" />
                <p className="mt-4 text-lg font-medium">Capturing face...</p>
              </div>
            )}

            {enrollmentStep === 'PROCESSING' && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <p className="mt-4 text-lg font-medium">Processing face data...</p>
                <p className="text-sm text-muted-foreground">Please wait while we verify your face</p>
              </div>
            )}

            {/* Camera Error */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center p-4">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                  <p className="text-destructive font-medium">{cameraError}</p>
                  <Button onClick={startCamera} className="mt-4">
                    Retry Camera
                  </Button>
                </div>
              </div>
            )}

            {/* Camera Loading */}
            {!cameraActive && !cameraError && enrollmentStep === 'IDLE' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Tips */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Tips for a successful enrollment:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Ensure your face is well-lit and clearly visible</li>
              <li>• Position your face within the oval guide</li>
              <li>• Look directly at the camera</li>
              <li>• Remove glasses, hats, or face coverings</li>
              <li>• Keep a neutral expression</li>
            </ul>
          </div>

          {/* Capture Button */}
          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={captureAndEnroll}
              disabled={!cameraActive || enrollmentStep !== 'IDLE'}
              className="min-w-48"
            >
              {enrollmentStep === 'IDLE' ? (
                <>
                  <Camera className="h-5 w-5 mr-2" />
                  Capture & Enroll
                </>
              ) : enrollmentStep === 'FAILED' ? (
                <>
                  <Camera className="h-5 w-5 mr-2" />
                  Try Again
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {stepLabels[enrollmentStep]}
                </>
              )}
            </Button>
          </div>

          {/* Security Notice */}
          <p className="text-xs text-center text-muted-foreground">
            Your face data is securely processed and stored for attendance verification only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceEnrollment;
