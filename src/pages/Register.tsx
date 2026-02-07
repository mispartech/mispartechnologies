import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { djangoApi } from "@/lib/api/client";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Camera, CheckCircle2, AlertCircle, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InviteData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  gender: string | null;
  department_id: string | null;
  organization_id: string | null;
  status: string;
  expires_at: string;
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"profile" | "face" | "complete">("profile");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Face capture state
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid registration link. Please contact your administrator.");
      setIsLoading(false);
      return;
    }

    fetchInviteData();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [token]);

  const fetchInviteData = async () => {
    try {
      // Try Django first for invite validation
      const djangoResult = await djangoApi.getInvite(token!);
      
      if (djangoResult.data && !djangoResult.error) {
        const data = djangoResult.data;
        if (data.status === "accepted") {
          setError("This invitation has already been used.");
          setIsLoading(false);
          return;
        }
        if (new Date(data.expires_at) < new Date()) {
          setError("This invitation has expired. Please contact your administrator for a new one.");
          setIsLoading(false);
          return;
        }
        setInviteData(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setPhone(data.phone_number || "");
        setIsLoading(false);
        return;
      }

      // Fallback: Check Supabase for invite (Phase 1 bridge for existing invites)
      console.log('[Register] Django invite endpoint unavailable, falling back to Supabase');
      const { data, error } = await supabase
        .from("member_invites")
        .select("*")
        .eq("token", token)
        .single();

      if (error || !data) {
        setError("Invalid or expired registration link.");
        setIsLoading(false);
        return;
      }

      if (data.status === "accepted") {
        setError("This invitation has already been used.");
        setIsLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("This invitation has expired. Please contact your administrator for a new one.");
        setIsLoading(false);
        return;
      }

      setInviteData(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setPhone(data.phone_number || "");
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching invite:", err);
      setError("Failed to load registration data.");
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setStep("face");
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 640, height: 480 } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        title: "Camera Error",
        description: "Could not access your camera. Please check permissions.",
        variant: "destructive",
      });
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setFaceImage(imageData);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsCapturing(false);
      }
    }
  };

  const retakePhoto = () => {
    setFaceImage(null);
    startCamera();
  };

  const handleCompleteRegistration = async () => {
    if (!inviteData || !faceImage) return;

    setIsSubmitting(true);
    try {
      // 1. Create Supabase auth user (identity provider)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!authData?.user) {
        throw new Error("Signup failed — no user returned");
      }

      // 2. Sync to Django to create backend user + get JWT
      const syncResult = await djangoApi.syncFromSupabase({
        supabase_uid: authData.user.id,
        email: inviteData.email,
        first_name: firstName,
        last_name: lastName,
      });

      if (syncResult.error || !syncResult.data?.user) {
        throw new Error(syncResult.error || "Account sync failed. Please retry.");
      }

      const djangoUserId = syncResult.data.user.id;

      // 3. Enroll face directly via Django API
      try {
        await djangoApi.enrollFace(
          djangoUserId,
          faceImage.replace(/^data:image\/\w+;base64,/, ''),
          `${firstName} ${lastName}`
        );
      } catch (faceError) {
        console.error("Face registration error:", faceError);
        // Continue - face can be registered later via enrollment page
      }

      // 4. Mark invite as accepted via Django (with Supabase fallback)
      try {
        await djangoApi.acceptInvite(inviteData.id);
      } catch {
        await supabase
          .from("member_invites")
          .update({ 
            status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .eq("id", inviteData.id);
      }

      setStep("complete");
      toast({
        title: "Registration Complete!",
        description: "Your account has been created successfully.",
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      toast({
        title: "Registration Failed",
        description: err.message || "Failed to complete registration",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Registration Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button className="w-full mt-4" onClick={() => navigate("/")}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Welcome to FaceAttend!</CardTitle>
            <CardDescription>
              Your account has been created and your face has been registered for attendance tracking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>
            {step === "profile" 
              ? "Set up your profile and password" 
              : "Capture your face photo for attendance"}
          </CardDescription>
          <div className="flex gap-2 mt-4">
            <div className={`flex-1 h-2 rounded ${step === "profile" || step === "face" ? "bg-primary" : "bg-muted"}`} />
            <div className={`flex-1 h-2 rounded ${step === "face" ? "bg-primary" : "bg-muted"}`} />
          </div>
        </CardHeader>
        <CardContent>
          {step === "profile" && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="p-3 bg-muted rounded-lg mb-4">
                <p className="text-sm text-muted-foreground">Registering as:</p>
                <p className="font-medium">{inviteData?.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Continue to Face Registration
              </Button>
            </form>
          )}

          {step === "face" && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {!faceImage && !isCapturing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <User className="h-16 w-16 text-muted-foreground mb-4" />
                    <Button onClick={startCamera}>
                      <Camera className="h-4 w-4 mr-2" />
                      Start Camera
                    </Button>
                  </div>
                )}
                
                {isCapturing && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
                
                {faceImage && (
                  <img
                    src={faceImage}
                    alt="Captured face"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-3">
                {isCapturing && (
                  <Button onClick={capturePhoto} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photo
                  </Button>
                )}
                
                {faceImage && (
                  <>
                    <Button variant="outline" onClick={retakePhoto} className="flex-1">
                      Retake Photo
                    </Button>
                    <Button 
                      onClick={handleCompleteRegistration} 
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Complete Registration"
                      )}
                    </Button>
                  </>
                )}
              </div>

              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => setStep("profile")}
              >
                Back to Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
