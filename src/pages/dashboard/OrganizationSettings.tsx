import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Users, 
  Bell,
  Save,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Feature labels for display
const featureLabels: Record<string, { label: string; description: string }> = {
  member_tracking: { label: 'Member Attendance Tracking', description: 'Track services and activities' },
  visitor_management: { label: 'Visitor Management', description: 'Record and follow up with visitors' },
  department_tracking: { label: 'Department/Ministry Tracking', description: 'Monitor by group' },
  tithe_integration: { label: 'Tithe & Offering Integration', description: 'Link attendance with giving' },
  pastoral_reports: { label: 'Pastoral Reports', description: 'Reports for leadership' },
  employee_attendance: { label: 'Employee Attendance', description: 'Track clock-in/out' },
  shift_management: { label: 'Shift Management', description: 'Manage schedules' },
  leave_management: { label: 'Leave Management', description: 'Track leave requests' },
  overtime_tracking: { label: 'Overtime Tracking', description: 'Monitor overtime' },
  payroll_integration: { label: 'Payroll Integration', description: 'Export for payroll' },
  student_attendance: { label: 'Student Attendance', description: 'Track class attendance' },
  staff_attendance: { label: 'Staff Attendance', description: 'Monitor staff presence' },
  parent_notifications: { label: 'Parent Notifications', description: 'Alert parents' },
  class_scheduling: { label: 'Class Scheduling', description: 'Manage schedules' },
  exam_attendance: { label: 'Exam Attendance', description: 'Track exam presence' },
  volunteer_tracking: { label: 'Volunteer Tracking', description: 'Track volunteer hours' },
  event_attendance: { label: 'Event Attendance', description: 'Monitor events' },
  donor_tracking: { label: 'Donor Engagement', description: 'Link with donors' },
  program_tracking: { label: 'Program Tracking', description: 'Monitor participation' },
  impact_reports: { label: 'Impact Reports', description: 'Reports for stakeholders' },
  custom_reports: { label: 'Custom Reports', description: 'Customized reports' },
  biometric_audit: { label: 'Biometric Audit Trail', description: 'Secure audit logs' },
  compliance_reports: { label: 'Compliance Reports', description: 'Regulatory reports' },
  emergency_alerts: { label: 'Emergency Alerts', description: 'Alert on-call staff' },
  shift_handover: { label: 'Shift Handover', description: 'Manage transitions' },
};

interface Organization {
  id: string;
  name: string;
  type: string;
  industry: string | null;
  size_range: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  features_enabled: string[];
  settings: Record<string, any>;
}

const OrganizationSettings = () => {
  const { profile } = useOutletContext<{ profile: any }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [settings, setSettings] = useState({
    autoMarkAttendance: true,
    recognitionThreshold: 0.7,
    allowMultipleCheckins: false,
    sendNotifications: true,
    requireApproval: false,
    trackLocation: false,
    enableSounds: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchOrganization();
  }, [profile]);

  const fetchOrganization = async () => {
    if (!profile?.organization_id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (error) throw error;
      const orgData = {
        ...data,
        settings: (typeof data.settings === 'object' && data.settings !== null) ? data.settings as Record<string, any> : {},
      };
      setOrganization(orgData);
      if (orgData.settings && typeof orgData.settings === 'object') {
        setSettings(prev => ({ ...prev, ...(orgData.settings as Record<string, any>) }));
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organization) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: organization.name,
          industry: organization.industry,
          address: organization.address,
          city: organization.city,
          country: organization.country,
          phone: organization.phone,
          email: organization.email,
          website: organization.website,
          settings,
        })
        .eq('id', organization.id);

      if (error) throw error;

      toast({
        title: 'Settings Saved',
        description: 'Organization settings have been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Organization</h3>
          <p className="text-muted-foreground">
            Your account is not linked to an organization. Please complete onboarding.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organization Settings</h1>
          <p className="text-muted-foreground">Manage your organization's configuration</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <Users className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Basic information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{organization.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="capitalize">{organization.type}</Badge>
                    {organization.size_range && (
                      <Badge variant="outline">{organization.size_range} members</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={organization.name}
                    onChange={(e) => setOrganization(prev => prev ? { ...prev, name: e.target.value } : prev)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={organization.industry || ''}
                    onChange={(e) => setOrganization(prev => prev ? { ...prev, industry: e.target.value } : prev)}
                    className="mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={organization.address || ''}
                    onChange={(e) => setOrganization(prev => prev ? { ...prev, address: e.target.value } : prev)}
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={organization.city || ''}
                    onChange={(e) => setOrganization(prev => prev ? { ...prev, city: e.target.value } : prev)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={organization.country || ''}
                    onChange={(e) => setOrganization(prev => prev ? { ...prev, country: e.target.value } : prev)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={organization.phone || ''}
                    onChange={(e) => setOrganization(prev => prev ? { ...prev, phone: e.target.value } : prev)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={organization.email || ''}
                    onChange={(e) => setOrganization(prev => prev ? { ...prev, email: e.target.value } : prev)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={organization.website || ''}
                    onChange={(e) => setOrganization(prev => prev ? { ...prev, website: e.target.value } : prev)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Enabled Features</CardTitle>
              <CardDescription>Features configured during onboarding</CardDescription>
            </CardHeader>
            <CardContent>
              {organization.features_enabled && organization.features_enabled.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {organization.features_enabled.map((featureId) => {
                    const feature = featureLabels[featureId];
                    return (
                      <div
                        key={featureId}
                        className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30"
                      >
                        <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">
                            {feature?.label || featureId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </p>
                          {feature?.description && (
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No features have been enabled yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Features are selected during organization onboarding.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Settings</CardTitle>
              <CardDescription>Configure how attendance tracking works</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-mark Attendance</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically record attendance when a face is recognized
                  </p>
                </div>
                <Switch
                  checked={settings.autoMarkAttendance}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoMarkAttendance: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow Multiple Check-ins</p>
                  <p className="text-sm text-muted-foreground">
                    Allow members to check in multiple times per day
                  </p>
                </div>
                <Switch
                  checked={settings.allowMultipleCheckins}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowMultipleCheckins: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require Approval</p>
                  <p className="text-sm text-muted-foreground">
                    New face registrations require admin approval
                  </p>
                </div>
                <Switch
                  checked={settings.requireApproval}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requireApproval: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Sounds</p>
                  <p className="text-sm text-muted-foreground">
                    Play sound effects for recognition events
                  </p>
                </div>
                <Switch
                  checked={settings.enableSounds}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableSounds: checked }))}
                />
              </div>

              <div>
                <Label>Recognition Threshold</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Minimum confidence level required for recognition (0.5 - 0.9)
                </p>
                <Input
                  type="number"
                  min="0.5"
                  max="0.9"
                  step="0.05"
                  value={settings.recognitionThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, recognitionThreshold: parseFloat(e.target.value) }))}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Send Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications for attendance events
                  </p>
                </div>
                <Switch
                  checked={settings.sendNotifications}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, sendNotifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Track Location</p>
                  <p className="text-sm text-muted-foreground">
                    Record location data with attendance (requires permission)
                  </p>
                </div>
                <Switch
                  checked={settings.trackLocation}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, trackLocation: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationSettings;
