import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TempMember {
  id: string;
  temp_face_id: string;
  face_roi_url: string | null;
  date: string;
  time: string;
  face_detections: number;
}

interface ClaimVisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitor: TempMember | null;
  onSuccess: () => void;
}

interface Department {
  id: string;
  name: string;
}

const ClaimVisitorModal = ({ isOpen, onClose, visitor, onSuccess }: ClaimVisitorModalProps) => {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    gender: '',
    departmentId: '',
  });
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();
  const { registerFace } = useFaceRecognition();

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        gender: '',
        departmentId: '',
      });
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    const { data, error } = await supabase.from('departments').select('id, name');
    if (!error && data) {
      setDepartments(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitor) return;

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Verify current user is an admin
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', currentUser.id)
        .single();

      if (!currentProfile?.organization_id) throw new Error('No organization found');

      // Verify caller has admin role (server-side enforced via RLS, but validate client-side too)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id);

      const isAdmin = roles && roles.some(r =>
        ['super_admin', 'admin', 'parish_pastor', 'department_head'].includes(r.role)
      );

      if (!isAdmin) {
        toast({
          title: 'Permission Denied',
          description: 'Only administrators can register visitors.',
          variant: 'destructive',
        });
        return;
      }

      // Verify the temp_attendance record exists and is still pending
      const { data: tempRecord, error: tempError } = await supabase
        .from('temp_attendance')
        .select('id, status')
        .eq('id', visitor.id)
        .single();

      if (tempError || !tempRecord) {
        throw new Error('Visitor record not found');
      }

      if (tempRecord.status === 'claimed') {
        toast({
          title: 'Already Claimed',
          description: 'This visitor has already been registered.',
          variant: 'destructive',
        });
        return;
      }

      // Create new user account (email verification required by default)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account');

      // Update the new user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phoneNumber,
          gender: formData.gender,
          department_id: formData.departmentId || null,
          organization_id: currentProfile.organization_id,
          face_image_url: visitor.face_roi_url,
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'member',
          organization_id: currentProfile.organization_id,
        });

      if (roleError) throw roleError;

      // Register face if we have the face image
      if (visitor.face_roi_url) {
        try {
          const response = await fetch(visitor.face_roi_url);
          const blob = await response.blob();
          const reader = new FileReader();
          
          await new Promise<void>((resolve, reject) => {
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              await registerFace(base64, {
                user_id: authData.user!.id,
                name: `${formData.firstName} ${formData.lastName}`,
              });
              resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (faceError) {
          console.error('Face registration error:', faceError);
        }
      }

      // Update temp_attendance record
      const { error: updateError } = await supabase
        .from('temp_attendance')
        .update({
          status: 'claimed',
          claimed_by: currentUser.id,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', visitor.id);

      if (updateError) throw updateError;

      // Log activity
      await logActivity({
        action: 'claim',
        entityType: 'visitor',
        entityId: visitor.id,
        metadata: {
          new_user_id: authData.user.id,
          temp_face_id: visitor.temp_face_id,
          name: `${formData.firstName} ${formData.lastName}`,
        },
      });

      toast({
        title: 'Visitor Registered',
        description: `${formData.firstName} ${formData.lastName} has been registered as a member.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error claiming visitor:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register visitor as member.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!visitor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Register Visitor as Member
          </DialogTitle>
          <DialogDescription>
            Convert this visitor to a registered member with face recognition
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <Avatar className="h-16 w-16">
            <AvatarImage src={visitor.face_roi_url || ''} alt="Visitor" />
            <AvatarFallback>V</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">Temp ID: {visitor.temp_face_id.slice(0, 12)}...</p>
            <p className="text-sm text-muted-foreground">
              First seen: {visitor.date} at {visitor.time}
            </p>
            <p className="text-sm text-muted-foreground">
              Appearances: {visitor.face_detections}
            </p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will create a new account and register their face for attendance tracking. The new member will need to verify their email.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input id="phoneNumber" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={formData.departmentId} onValueChange={(v) => setFormData({ ...formData, departmentId: v })}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering...</>) : 'Register Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimVisitorModal;
