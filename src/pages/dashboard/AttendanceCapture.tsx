import { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  CameraOff, 
  UserCheck, 
  UserX, 
  RefreshCw,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';

interface RecognizedPerson {
  id: string;
  type: 'member' | 'visitor';
  name?: string;
  confidence?: number | null;
  timestamp: Date;
  attendanceStatus?: string;
}

const AttendanceCapture = () => {
  const { profile } = useOutletContext<{ profile: any }>();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [recognizedPersons, setRecognizedPersons] = useState<RecognizedPerson[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [stats, setStats] = useState({ total: 0, members: 0, visitors: 0 });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const { recognizeFace, checkHealth, isProcessing } = useFaceRecognition();

  // Check API health on mount
  useEffect(() => {
    const checkApiHealth = async () => {
      setApiStatus('checking');
      const health = await checkHealth();
      if (health?.success && health.django_api === 'connected') {
        setApiStatus('connected');
      } else {
        setApiStatus('disconnected');
        toast({
          title: 'API Connection Issue',
          description: health?.error || 'Unable to connect to face recognition service',
          variant: 'destructive',
        });
      }
    };
    checkApiHealth();
  }, [checkHealth, toast]);

  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    
    // Check if video is actually playing
    if (videoRef.current.readyState < 2) {
      console.log('Video not ready yet, skipping frame capture');
      return;
    }
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Ensure video dimensions are valid
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('Video dimensions not ready');
        return;
      }
      
      context.drawImage(video, 0, 0);
      
      // Get base64 without the data URL prefix
      const frameData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Image = frameData.split(',')[1];
      
      console.log('Sending frame for recognition, size:', base64Image.length);
      
      // Call recognition with organization context
      const result = await recognizeFace(base64Image, profile?.organization_id);

      if (result?.success && result.faces && result.faces.length > 0) {
        for (const face of result.faces) {
          const person: RecognizedPerson = {
            id: face.user_id || face.temp_face_id || Date.now().toString(),
            type: face.type === 'member' ? 'member' : 'visitor',
            name: face.name,
            confidence: face.confidence,
            timestamp: new Date(),
            attendanceStatus: face.attendance_status,
          };

          // Check if already recognized recently (within 30 seconds)
          const exists = recognizedPersons.find(
            p => p.id === person.id && 
            (Date.now() - p.timestamp.getTime()) < 30000
          );

          if (!exists) {
            setRecognizedPersons(prev => [person, ...prev.slice(0, 19)]);
            
            // Update stats
            setStats(prev => ({
              total: prev.total + 1,
              members: person.type === 'member' ? prev.members + 1 : prev.members,
              visitors: person.type === 'visitor' ? prev.visitors + 1 : prev.visitors,
            }));
            
            if (soundEnabled) {
              const audio = new Audio('/success.mp3');
              audio.play().catch(() => {});
            }

            const isNewAttendance = face.attendance_status === 'marked' || face.attendance_status === 'recorded';
            
            toast({
              title: person.type === 'member' ? 'Member Recognized' : 'Visitor Detected',
              description: `${person.name || 'Unknown'} - ${isNewAttendance ? 'Attendance marked' : 'Already recorded'}`,
              variant: isNewAttendance ? 'default' : undefined,
            });
          }
        }
      }
    } catch (err) {
      console.error('Recognition error:', err);
    }
  }, [isProcessing, recognizeFace, profile?.organization_id, recognizedPersons, soundEnabled, toast]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsCameraStarting(true);
      
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        }
      });
      
      console.log('Camera stream obtained:', stream.getVideoTracks()[0].label);
      
      if (videoRef.current) {
        // Store stream reference
        streamRef.current = stream;
        
        // Set video source
        videoRef.current.srcObject = stream;
        
        // Wait for video to load metadata
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }
          
          const handleLoadedMetadata = () => {
            console.log('Video metadata loaded:', {
              width: videoRef.current?.videoWidth,
              height: videoRef.current?.videoHeight
            });
            resolve();
          };
          
          const handleError = (e: Event) => {
            reject(new Error('Video failed to load'));
          };
          
          videoRef.current.onloadedmetadata = handleLoadedMetadata;
          videoRef.current.onerror = handleError;
          
          // Timeout after 10 seconds
          setTimeout(() => reject(new Error('Video load timeout')), 10000);
        });
        
        // Play video
        await videoRef.current.play();
        console.log('Video playing successfully');
        
        // Mark camera as on
        setIsCameraOn(true);
        setIsCameraStarting(false);
        
        toast({
          title: 'Camera Started',
          description: 'Face recognition is now active',
        });
        
        // Start auto-capture every 3 seconds
        intervalRef.current = setInterval(captureAndRecognize, 3000);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setIsCameraStarting(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Unable to access camera: ${errorMessage}. Please check permissions.`);
      toast({
        title: 'Camera Error',
        description: `Unable to access camera. Please check permissions.`,
        variant: 'destructive',
      });
      
      // Clean up any partial stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.label);
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraOn(false);
    setIsCameraStarting(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const getStatusIcon = () => {
    switch (apiStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
  };

  const getCameraStatusText = () => {
    if (isCameraStarting) return 'Starting camera...';
    if (isCameraOn) return 'Camera active';
    if (apiStatus !== 'connected') return 'Waiting for API connection...';
    return 'Click "Start Camera" to begin';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mark Attendance</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Use face recognition to mark attendance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge 
            variant={apiStatus === 'connected' ? 'default' : 'destructive'} 
            className="gap-1"
          >
            {getStatusIcon()}
            <span className="hidden sm:inline">
              {apiStatus === 'connected' ? 'API Connected' : apiStatus === 'checking' ? 'Checking...' : 'API Offline'}
            </span>
            <span className="sm:hidden">
              {apiStatus === 'connected' ? 'Online' : 'Offline'}
            </span>
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            onClick={isCameraOn ? stopCamera : startCamera}
            variant={isCameraOn ? 'destructive' : 'default'}
            className="gap-2 flex-1 sm:flex-none"
            size="sm"
            disabled={apiStatus !== 'connected' || isCameraStarting}
          >
            {isCameraStarting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Starting...</span>
              </>
            ) : isCameraOn ? (
              <>
                <CameraOff className="w-4 h-4" />
                <span className="hidden sm:inline">Stop Camera</span>
                <span className="sm:hidden">Stop</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Start Camera</span>
                <span className="sm:hidden">Start</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="text-xl sm:text-2xl font-bold text-primary">{stats.members}</div>
            <p className="text-xs text-muted-foreground">Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <div className="text-xl sm:text-2xl font-bold text-accent-foreground">{stats.visitors}</div>
            <p className="text-xs text-muted-foreground">Visitors</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Camera Feed</span>
              <div className="flex items-center gap-2">
                {isCameraOn && (
                  <Badge variant="outline" className="gap-1 text-primary border-primary">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Live
                  </Badge>
                )}
                {isProcessing && (
                  <Badge variant="secondary" className="animate-pulse">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Processing...
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {/* Video element - always rendered but visibility controlled */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCameraOn ? 'block' : 'hidden'}`}
              />
              
              {/* Scanning overlay - only shown when camera is on */}
              {isCameraOn && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-primary rounded-lg">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                  </div>
                </div>
              )}
              
              {/* Placeholder when camera is off */}
              {!isCameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  {isCameraStarting ? (
                    <>
                      <RefreshCw className="w-16 h-16 mb-4 animate-spin opacity-50" />
                      <p>Starting camera...</p>
                      <p className="text-sm">Please wait</p>
                    </>
                  ) : (
                    <>
                      <Camera className="w-16 h-16 mb-4 opacity-50" />
                      <p>Camera is off</p>
                      <p className="text-sm">{getCameraStatusText()}</p>
                    </>
                  )}
                </div>
              )}
            </div>
            
            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />
            
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
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
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recognizedPersons.map((person, index) => (
                  <div 
                    key={`${person.id}-${index}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className={`p-2 rounded-full ${
                      person.type === 'member' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-accent text-accent-foreground'
                    }`}>
                      {person.type === 'member' ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <UserX className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {person.name || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {person.timestamp.toLocaleTimeString()}
                        </p>
                        {person.attendanceStatus === 'marked' && (
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                        )}
                        {person.attendanceStatus === 'already_marked' && (
                          <AlertCircle className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {person.confidence != null && (
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
