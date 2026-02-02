import { useState, useRef, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  CameraOff, 
  RefreshCw,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFaceRecognition, TrackedFace } from '@/hooks/useFaceRecognition';
import FaceOverlay, { FaceOverlayData } from '@/components/dashboard/FaceOverlay';

interface RecognizedPerson {
  id: string;
  type: 'member' | 'visitor';
  name?: string;
  confidence?: number | null;
  timestamp: Date;
  attendanceStatus?: string;
}

// Throttle configuration
const FRAME_INTERVAL_MS = 150; // 150ms between frames (6-7 FPS)
const PAUSE_DURATION_MS = 3000; // Pause for 3s after confirmed/visitor

const AttendanceCapture = () => {
  const { profile } = useOutletContext<{ profile: any }>();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [recognizedPersons, setRecognizedPersons] = useState<RecognizedPerson[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [stats, setStats] = useState({ total: 0, members: 0, visitors: 0 });
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureLoopRef = useRef<number | null>(null);
  const lastCaptureTimeRef = useRef<number>(0);
  const pausedUntilRef = useRef<number>(0);
  
  const { toast } = useToast();
  const { 
    recognizeFace, 
    checkHealth, 
    isProcessing, 
    trackedFaces, 
    scanningBboxes,
    clearFaces,
    pruneStalefaces 
  } = useFaceRecognition();

  // Convert TrackedFace to FaceOverlayData (only recognized members)
  const facesForOverlay: FaceOverlayData[] = trackedFaces.map(face => ({
    bbox: face.bbox,
    name: face.name,
    attendanceStatus: face.attendanceStatus,
    confidence: face.confidence,
  }));

  // Add scanning overlay bboxes for unrecognized faces (no attendance entry)
  const scanningFacesForOverlay: FaceOverlayData[] = scanningBboxes.map(bbox => ({
    bbox,
    attendanceStatus: 'detecting' as const,
  }));

  // Combined overlay: recognized faces + scanning bboxes
  const allFacesForOverlay = [...facesForOverlay, ...scanningFacesForOverlay];

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

  // Update container dimensions on resize
  useEffect(() => {
    const updateContainerDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateContainerDimensions();
    window.addEventListener('resize', updateContainerDimensions);
    return () => window.removeEventListener('resize', updateContainerDimensions);
  }, []);

  // Prune stale faces periodically
  useEffect(() => {
    if (!isCameraOn) return;
    
    const interval = setInterval(pruneStalefaces, 1000);
    return () => clearInterval(interval);
  }, [isCameraOn, pruneStalefaces]);

  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const now = Date.now();
    
    // Check if we're paused
    if (now < pausedUntilRef.current) {
      return;
    }
    
    // Throttle frame submission
    if (now - lastCaptureTimeRef.current < FRAME_INTERVAL_MS) {
      return;
    }
    
    // Skip if already processing
    if (isProcessing) return;
    
    // Check if video is ready
    if (videoRef.current.readyState < 2) {
      return;
    }
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      // Ensure video dimensions are valid
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      // Update video dimensions for overlay scaling
      setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
      
      // Get base64 without the data URL prefix
      const frameData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Image = frameData.split(',')[1];
      
      lastCaptureTimeRef.current = now;
      
      // Call recognition
      const result = await recognizeFace(base64Image, profile?.organization_id);

      if (result.success && result.faces.length > 0) {
        // Check if we should pause (confirmed attendance)
        if (result.shouldPause) {
          pausedUntilRef.current = Date.now() + PAUSE_DURATION_MS;
        }

        // Process each recognized face for history and stats
        // Only members create attendance entries now
        for (const face of result.faces) {
          // Skip faces that are still detecting
          if (face.attendanceStatus === 'detecting') continue;
          
          const person: RecognizedPerson = {
            id: face.id,
            type: 'member', // Only members now
            name: face.name,
            confidence: face.confidence,
            timestamp: new Date(),
            attendanceStatus: face.attendanceMarked ? 'marked' : 'detecting',
          };

          // Check if already in recent history (within 30 seconds)
          const exists = recognizedPersons.find(
            p => p.id === person.id && 
            (Date.now() - p.timestamp.getTime()) < 30000
          );

          if (!exists) {
            setRecognizedPersons(prev => [person, ...prev.slice(0, 19)]);
            
            // Update stats - only members now
            setStats(prev => ({
              total: prev.total + 1,
              members: prev.members + 1,
              visitors: prev.visitors, // No longer incremented
            }));
            
            if (soundEnabled) {
              const audio = new Audio('/success.mp3');
              audio.play().catch(() => {});
            }

            const isNewAttendance = face.attendanceMarked === true;
            
            toast({
              title: 'Member Recognized',
              description: `${person.name || 'Unknown'} - ${isNewAttendance ? 'Attendance marked' : 'Already recorded'}`,
              variant: isNewAttendance ? 'default' : undefined,
            });
          }
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AttendanceCapture] Recognition error:', err);
      }
    }
  }, [isProcessing, recognizeFace, profile?.organization_id, recognizedPersons, soundEnabled, toast]);

  // Capture loop using requestAnimationFrame
  const startCaptureLoop = useCallback(() => {
    const loop = () => {
      if (!isCameraOn) return;
      
      captureAndRecognize();
      captureLoopRef.current = requestAnimationFrame(loop);
    };
    
    captureLoopRef.current = requestAnimationFrame(loop);
  }, [isCameraOn, captureAndRecognize]);

  const stopCaptureLoop = useCallback(() => {
    if (captureLoopRef.current) {
      cancelAnimationFrame(captureLoopRef.current);
      captureLoopRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setIsCameraStarting(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        }
      });
      
      if (videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }
          
          const handleLoadedMetadata = () => resolve();
          const handleError = () => reject(new Error('Video failed to load'));
          
          videoRef.current.onloadedmetadata = handleLoadedMetadata;
          videoRef.current.onerror = handleError;
          
          setTimeout(() => reject(new Error('Video load timeout')), 10000);
        });
        
        await videoRef.current.play();
        
        setIsCameraOn(true);
        setIsCameraStarting(false);
        
        // Reset pause state
        pausedUntilRef.current = 0;
        lastCaptureTimeRef.current = 0;
        
        toast({
          title: 'Camera Started',
          description: 'Face recognition is now active',
        });
      }
    } catch (err) {
      setIsCameraStarting(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Unable to access camera: ${errorMessage}. Please check permissions.`);
      toast({
        title: 'Camera Error',
        description: `Unable to access camera. Please check permissions.`,
        variant: 'destructive',
      });
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopCamera = useCallback(() => {
    stopCaptureLoop();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    clearFaces();
    setIsCameraOn(false);
    setIsCameraStarting(false);
  }, [stopCaptureLoop, clearFaces]);

  // Start/stop capture loop when camera state changes
  useEffect(() => {
    if (isCameraOn) {
      startCaptureLoop();
    } else {
      stopCaptureLoop();
    }
    
    return () => stopCaptureLoop();
  }, [isCameraOn, startCaptureLoop, stopCaptureLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const resetSession = () => {
    setRecognizedPersons([]);
    setStats({ total: 0, members: 0, visitors: 0 });
    clearFaces();
    pausedUntilRef.current = 0;
  };

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
            <div ref={containerRef} className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {/* Video element - always rendered but visibility controlled */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCameraOn ? 'block' : 'hidden'}`}
              />
              
              {/* Hidden canvas for frame capture */}
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Face detection overlay - includes recognized faces + scanning bboxes */}
              {isCameraOn && allFacesForOverlay.length > 0 && (
                <FaceOverlay
                  faces={allFacesForOverlay}
                  videoWidth={videoDimensions.width}
                  videoHeight={videoDimensions.height}
                  containerWidth={containerDimensions.width}
                  containerHeight={containerDimensions.height}
                />
              )}
              
              {/* No static placeholder - FaceOverlay handles all detection visualization */}
              
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
                      <p className="text-sm">Click "Start Camera" to begin</p>
                    </>
                  )}
                </div>
              )}
              
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
                  <p className="text-destructive text-center px-4">{error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Recognitions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent</span>
              <Button variant="ghost" size="sm" onClick={resetSession}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recognizedPersons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recognitions yet
                </p>
              ) : (
                recognizedPersons.map((person, index) => (
                  <div
                    key={`${person.id}-${index}`}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      person.type === 'member' ? 'bg-primary' : 'bg-amber-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {person.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {person.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge variant={person.type === 'member' ? 'default' : 'secondary'} className="text-xs">
                      {person.type === 'member' ? 'Member' : 'Visitor'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceCapture;
