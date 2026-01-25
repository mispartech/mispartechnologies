import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Mail, Clock, CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface AdminInvite {
  id: string;
  email: string;
  invited_role: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface Admin {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
}

const ADMIN_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'parish_pastor', label: 'Parish Pastor' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'ushering_head_admin', label: 'Ushering Head Admin' },
  { value: 'usher_admin', label: 'Usher Admin' },
];

const AdminManagement = () => {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch existing admin roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .in('role', ['super_admin', 'admin', 'parish_pastor', 'department_head', 'ushering_head_admin', 'usher_admin']);

      if (rolesError) throw rolesError;

      // Get unique user IDs and fetch their profiles
      const userIds = [...new Set((rolesData || []).map(r => r.user_id))];
      
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as Record<string, any>);
      }

      const adminsList = (rolesData || []).map((r: any) => ({
        id: r.user_id,
        email: profilesMap[r.user_id]?.email || '',
        first_name: profilesMap[r.user_id]?.first_name,
        last_name: profilesMap[r.user_id]?.last_name,
        role: r.role,
        created_at: r.created_at
      }));

      setAdmins(adminsList);

      // Fetch pending invites
      const { data: invitesData, error: invitesError } = await supabase
        .from('admin_invites')
        .select('*')
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;
      setInvites(invitesData || []);
    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load admin data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an email address.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user?.id)
        .single();

      // Get organization name for the email
      let organizationName = 'Our Organization';
      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.organization_id)
          .single();
        if (org?.name) organizationName = org.name;
      }

      const { data, error } = await supabase
        .from('admin_invites')
        .insert([{
          email: inviteEmail.trim().toLowerCase(),
          invited_role: inviteRole as any,
          organization_id: profile?.organization_id,
          invited_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Send the invite email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-admin-invite', {
        body: {
          inviteId: data.id,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          token: data.token,
          organizationName
        }
      });

      if (emailError) {
        console.error('Error sending email:', emailError);
        // Still log the activity even if email fails - invite was created
        toast({
          title: 'Invite Created',
          description: `Invitation created but email failed to send. You may need to resend.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Invite Sent',
          description: `Invitation sent to ${inviteEmail}. They will receive an email to complete registration.`,
        });
      }

      await logActivity({
        action: 'invite',
        entityType: 'admin',
        entityId: data.id,
        metadata: { email: inviteEmail, role: inviteRole }
      });

      setInviteEmail('');
      setInviteRole('admin');
      setInviteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'parish_pastor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'department_head': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admin Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage administrators and send invitations</p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite New Admin</DialogTitle>
              <DialogDescription>
                Send an invitation email to add a new administrator to your organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleSendInvite} disabled={sending} className="w-full sm:w-auto">
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Current Administrators
          </CardTitle>
          <CardDescription>
            All users with administrative privileges in your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No administrators found
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        {admin.first_name && admin.last_name
                          ? `${admin.first_name} ${admin.last_name}`
                          : 'Not set'}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(admin.role)}>
                          {admin.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(admin.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {admins.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 px-4">
                No administrators found
              </div>
            ) : (
              admins.map((admin) => (
                <div key={admin.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {admin.first_name && admin.last_name
                          ? `${admin.first_name} ${admin.last_name}`
                          : 'Not set'}
                      </p>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                    </div>
                    <Badge className={getRoleBadgeColor(admin.role)}>
                      {admin.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Since {format(new Date(admin.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
          <CardDescription>
            Invitations that haven't been accepted yet
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No pending invitations
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((invite) => {
                    const isExpired = new Date(invite.expires_at) < new Date();
                    return (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">{invite.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(invite.invited_role)}>
                            {invite.invited_role.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invite.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invite.expires_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {isExpired ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <XCircle className="h-3 w-3" />
                              Expired
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {invites.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 px-4">
                No pending invitations
              </div>
            ) : (
              invites.map((invite) => {
                const isExpired = new Date(invite.expires_at) < new Date();
                return (
                  <div key={invite.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate flex-1 mr-2">{invite.email}</p>
                      {isExpired ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getRoleBadgeColor(invite.invited_role)}>
                        {invite.invited_role.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Sent: {format(new Date(invite.created_at), 'MMM d')}</span>
                      <span>Expires: {format(new Date(invite.expires_at), 'MMM d')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminManagement;
