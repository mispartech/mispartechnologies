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

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsCameraOn(true);
            // Start auto-capture every 3 seconds
            intervalRef.current = setInterval(captureAndRecognize, 3000);
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
        description: `Unable to access camera. Please check permissions.`,
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

  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      // Get base64 without the data URL prefix
      const frameData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Image = frameData.split(',')[1];
      
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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const getStatusIcon = () => {
    switch (apiStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-destructive" />;
      default:
        return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mark Attendance</h1>
          <p className="text-muted-foreground">Use face recognition to mark attendance</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={apiStatus === 'connected' ? 'default' : 'destructive'} className="gap-1">
            {getStatusIcon()}
            {apiStatus === 'connected' ? 'API Connected' : apiStatus === 'checking' ? 'Checking...' : 'API Offline'}
          </Badge>
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
            disabled={apiStatus !== 'connected'}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.members}</div>
            <p className="text-xs text-muted-foreground">Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.visitors}</div>
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
                  <p className="text-sm">
                    {apiStatus === 'connected' 
                      ? 'Click "Start Camera" to begin' 
                      : 'Waiting for API connection...'}
                  </p>
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
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recognizedPersons.map((person, index) => (
                  <div 
                    key={`${person.id}-${index}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className={`p-2 rounded-full ${
                      person.type === 'member' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
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
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                        {person.attendanceStatus === 'already_marked' && (
                          <AlertCircle className="w-3 h-3 text-yellow-500" />
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
