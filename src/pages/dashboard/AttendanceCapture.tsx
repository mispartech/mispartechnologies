import { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Camera, 
  CameraOff, 
  UserCheck, 
  UserX, 
  RefreshCw,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecognizedPerson {
  id: string;
  type: 'user' | 'temp';
  name?: string;
  confidence?: number;
  timestamp: Date;
}

const AttendanceCapture = () => {
  const { profile } = useOutletContext<{ profile: any }>();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedPersons, setRecognizedPersons] = useState<RecognizedPerson[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready before setting camera on
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsCameraOn(true);
            // Start auto-capture every 2 seconds after video is playing
            intervalRef.current = setInterval(captureAndRecognize, 2000);
          }).catch((playErr) => {
            console.error('Video play error:', playErr);
            setError('Unable to start video playback.');
          });
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Unable to access camera: ${errorMessage}. Please check permissions.`);
      toast({
        title: 'Camera Error',
        description: `Unable to access camera: ${errorMessage}. Please check permissions.`,
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsCameraOn(false);
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const frameData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Call edge function for recognition
      const { data, error } = await supabase.functions.invoke('face-recognition', {
        body: { 
          action: 'recognize',
          frame: frameData 
        }
      });

      if (error) throw error;

      if (data?.status === 'success' && data?.data?.faces) {
        for (const face of data.data.faces) {
          const person: RecognizedPerson = {
            id: face.user_id || face.temp_id || Date.now().toString(),
            type: face.user_id ? 'user' : 'temp',
            name: face.name,
            confidence: face.confidence,
            timestamp: new Date(),
          };

          // Check if already recognized recently
          const exists = recognizedPersons.find(
            p => p.id === person.id && 
            (Date.now() - p.timestamp.getTime()) < 30000
          );

          if (!exists) {
            setRecognizedPersons(prev => [person, ...prev.slice(0, 9)]);
            
            if (soundEnabled) {
              // Play success sound
              const audio = new Audio('/success.mp3');
              audio.play().catch(() => {});
            }

            toast({
              title: person.type === 'user' ? 'Member Recognized' : 'Visitor Detected',
              description: person.name || 'Unknown person detected',
            });
          }
        }
      }
    } catch (err) {
      console.error('Recognition error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mark Attendance</h1>
          <p className="text-muted-foreground">Use face recognition to mark attendance</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            onClick={isCameraOn ? stopCamera : startCamera}
            variant={isCameraOn ? 'destructive' : 'default'}
            className="gap-2"
          >
            {isCameraOn ? (
              <>
                <CameraOff className="w-4 h-4" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Start Camera
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Camera Feed</span>
              {isProcessing && (
                <Badge variant="secondary" className="animate-pulse">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Processing...
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {isCameraOn ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-primary rounded-lg">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Camera className="w-16 h-16 mb-4 opacity-50" />
                  <p>Camera is off</p>
                  <p className="text-sm">Click "Start Camera" to begin</p>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            
            {error && (
              <p className="mt-4 text-sm text-destructive text-center">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Recognitions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Recognitions</CardTitle>
          </CardHeader>
          <CardContent>
            {recognizedPersons.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No recognitions yet
              </p>
            ) : (
              <div className="space-y-3">
                {recognizedPersons.map((person, index) => (
                  <div 
                    key={`${person.id}-${index}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className={`p-2 rounded-full ${
                      person.type === 'user' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {person.type === 'user' ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {person.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {person.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {person.confidence && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(person.confidence * 100)}%
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceCapture;
