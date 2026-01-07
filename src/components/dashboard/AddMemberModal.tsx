import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddMemberModal = ({ isOpen, onClose, onSuccess }: AddMemberModalProps) => {
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', first_name: '', last_name: '',
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { first_name: formData.first_name, last_name: formData.last_name } }
      });
      if (authError) throw authError;
      
      if (authData.user) {
        await supabase.from('profiles').update({
          phone_number: formData.phone_number,
          gender: formData.gender,
          department_id: formData.department_id || null,
          role: 'member'
        }).eq('id', authData.user.id);
      }
      
      toast({ title: 'Success', description: 'Member added successfully' });
      onSuccess();
      onClose();
      setFormData({ email: '', password: '', first_name: '', last_name: '', phone_number: '', gender: '', department_id: '' });
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} />
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
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Adding...' : 'Add Member'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberModal;
