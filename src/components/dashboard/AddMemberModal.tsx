import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddMemberModal = ({ isOpen, onClose, onSuccess }: AddMemberModalProps) => {
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '', first_name: '', last_name: '',
    phone_number: '', gender: '', department_id: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      supabase.from('departments').select('id, name').then(({ data }) => setDepartments(data || []));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Get current admin's organization
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', currentUser.id)
        .single();

      if (!adminProfile?.organization_id) {
        throw new Error('No organization found. Please complete onboarding first.');
      }

      // Create member invite instead of directly creating user
      const { data: invite, error: inviteError } = await supabase
        .from('member_invites')
        .insert({
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number || null,
          gender: formData.gender || null,
          department_id: formData.department_id || null,
          organization_id: adminProfile.organization_id,
          invited_by: currentUser.id,
          status: 'pending',
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Send invite email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-member-invite', {
        body: {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          token: invite.token,
        }
      });

      if (emailError) {
        console.error('Failed to send invite email:', emailError);
        // Don't fail the operation, invite was created
        toast({ 
          title: 'Member Added', 
          description: 'Member invite created. Email sending may have failed - you can resend later.',
          variant: 'default'
        });
      } else {
        toast({ 
          title: 'Member Invited', 
          description: 'An email has been sent to the member to set up their account.' 
        });
      }

      onSuccess();
      onClose();
      setFormData({ email: '', first_name: '', last_name: '', phone_number: '', gender: '', department_id: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add New Member</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert className="bg-primary/5 border-primary/20">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              The member will receive an email invitation to set their password and complete face enrollment.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input 
                value={formData.first_name} 
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} 
                required 
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input 
                value={formData.last_name} 
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} 
                required 
                placeholder="Doe"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              required 
              placeholder="john.doe@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input 
              value={formData.phone_number} 
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} 
              placeholder="+1 234 567 8900"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending Invite...' : 'Send Invitation'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberModal;
