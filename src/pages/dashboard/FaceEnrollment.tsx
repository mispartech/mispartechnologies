import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DashboardContext {
  user: any;
  profile: any;
  session: any;
}

const FaceEnrollment = () => {
  const context = useOutletContext<DashboardContext>();
  const { user, profile } = context;
  const navigate = useNavigate();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);

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

  // Capture image from camera
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setEnrollmentError(null);
    stopCamera();
  }, [stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setEnrollmentError(null);
    startCamera();
  }, [startCamera]);

  // Submit face enrollment
  const submitEnrollment = async () => {
    if (!capturedImage || !user?.id) return;

    setIsEnrolling(true);
    setEnrollmentError(null);

    try {
      // Extract base64 data without the data URL prefix
      const base64Image = capturedImage.replace(/^data:image\/\w+;base64,/, '');

      const { data, error } = await supabase.functions.invoke('face-enroll', {
        body: {
          image: base64Image,
          user_id: user.id,
          user_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email,
        }
      });

      if (error) throw error;

      if (data.success) {
        setEnrollmentSuccess(true);
        toast({
          title: 'Face Enrolled Successfully',
          description: 'Your face has been registered. You can now use face recognition features.',
        });

        // Wait a moment then navigate to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else if (data.error === 'duplicate_face') {
        setEnrollmentError('This face appears to be already enrolled for another user. Please contact an administrator if this is an error.');
      } else {
        setEnrollmentError(data.message || 'Face enrollment failed. Please try again with a clearer photo.');
      }
    } catch (err: any) {
      console.error('Enrollment error:', err);
      setEnrollmentError(err.message || 'Failed to enroll face. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // If already enrolled, redirect
  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('face_embeddings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        // Already enrolled, redirect to dashboard
        navigate('/dashboard');
      }
    };

    checkEnrollment();
  }, [user?.id, navigate]);

  if (enrollmentSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Enrollment Complete!</h2>
            <p className="text-muted-foreground">
              Redirecting you to the dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Camera className="h-6 w-6" />
            Face Enrollment Required
          </CardTitle>
          <CardDescription>
            To use the attendance system, you need to enroll your face. 
            Please position your face clearly in the camera and take a photo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Camera/Preview Area */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center p-4">
                      <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                      <p className="text-destructive">{cameraError}</p>
                      <Button onClick={startCamera} className="mt-4">
                        Retry Camera
                      </Button>
                    </div>
                  </div>
                )}
                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            ) : (
              <img 
                src={capturedImage} 
                alt="Captured face" 
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Error Message */}
          {enrollmentError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{enrollmentError}</AlertDescription>
            </Alert>
          )}

          {/* Tips */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Tips for a good enrollment photo:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Ensure your face is well-lit and clearly visible</li>
              <li>• Look directly at the camera</li>
              <li>• Remove glasses or hats if possible</li>
              <li>• Keep a neutral expression</li>
              <li>• Make sure only your face is in the frame</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            {!capturedImage ? (
              <Button 
                size="lg" 
                onClick={captureImage}
                disabled={!cameraActive}
              >
                <Camera className="h-5 w-5 mr-2" />
                Capture Photo
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={retakePhoto}
                  disabled={isEnrolling}
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Retake
                </Button>
                <Button 
                  size="lg" 
                  onClick={submitEnrollment}
                  disabled={isEnrolling}
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Confirm & Enroll
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceEnrollment;
