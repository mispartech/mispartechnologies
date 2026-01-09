import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Church, 
  GraduationCap, 
  Hospital, 
  Landmark, 
  Heart,
  Briefcase,
  Users,
  Settings,
  ArrowRight,
  ArrowLeft,
  Check,
  Scan
} from 'lucide-react';

type OrganizationType = 'church' | 'corporate' | 'school' | 'hospital' | 'government' | 'nonprofit' | 'other';

interface OnboardingData {
  organizationType: OrganizationType | null;
  organizationName: string;
  industry: string;
  sizeRange: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  features: string[];
  adminFirstName: string;
  adminLastName: string;
  adminRole: string;
}

const organizationTypes = [
  { type: 'church' as const, label: 'Church/Religious', icon: Church, description: 'Churches, mosques, temples, and religious organizations' },
  { type: 'corporate' as const, label: 'Corporate', icon: Briefcase, description: 'Businesses, companies, and enterprises' },
  { type: 'school' as const, label: 'Educational', icon: GraduationCap, description: 'Schools, universities, and training centers' },
  { type: 'hospital' as const, label: 'Healthcare', icon: Hospital, description: 'Hospitals, clinics, and medical facilities' },
  { type: 'government' as const, label: 'Government', icon: Landmark, description: 'Government agencies and public institutions' },
  { type: 'nonprofit' as const, label: 'Non-Profit', icon: Heart, description: 'NGOs, charities, and community organizations' },
  { type: 'other' as const, label: 'Other', icon: Building2, description: 'Other organization types' },
];

const sizeRanges = ['1-10', '11-50', '51-200', '201-500', '500+'];

const featuresByType: Record<OrganizationType, { id: string; label: string; description: string }[]> = {
  church: [
    { id: 'member_tracking', label: 'Member Attendance Tracking', description: 'Track Sunday services, events, and activities' },
    { id: 'visitor_management', label: 'Visitor Management', description: 'Record and follow up with first-time visitors' },
    { id: 'department_tracking', label: 'Department/Ministry Tracking', description: 'Monitor attendance by choir, ushers, etc.' },
    { id: 'tithe_integration', label: 'Tithe & Offering Integration', description: 'Link attendance with giving records' },
    { id: 'pastoral_reports', label: 'Pastoral Reports', description: 'Generate reports for church leadership' },
  ],
  corporate: [
    { id: 'employee_attendance', label: 'Employee Attendance', description: 'Track daily clock-in and clock-out' },
    { id: 'shift_management', label: 'Shift Management', description: 'Manage multiple shifts and schedules' },
    { id: 'leave_management', label: 'Leave Management', description: 'Track leave requests and approvals' },
    { id: 'overtime_tracking', label: 'Overtime Tracking', description: 'Monitor and calculate overtime hours' },
    { id: 'payroll_integration', label: 'Payroll Integration', description: 'Export data for payroll processing' },
  ],
  school: [
    { id: 'student_attendance', label: 'Student Attendance', description: 'Track daily class attendance' },
    { id: 'staff_attendance', label: 'Staff Attendance', description: 'Monitor teacher and staff presence' },
    { id: 'parent_notifications', label: 'Parent Notifications', description: 'Alert parents of absences' },
    { id: 'class_scheduling', label: 'Class Scheduling', description: 'Manage class schedules and rooms' },
    { id: 'exam_attendance', label: 'Exam Attendance', description: 'Track attendance during examinations' },
  ],
  hospital: [
    { id: 'staff_attendance', label: 'Staff Attendance', description: 'Track doctor and nurse schedules' },
    { id: 'shift_handover', label: 'Shift Handover', description: 'Manage shift transitions smoothly' },
    { id: 'emergency_alerts', label: 'Emergency Alerts', description: 'Alert on-call staff when needed' },
    { id: 'department_tracking', label: 'Department Tracking', description: 'Monitor by department or ward' },
    { id: 'compliance_reports', label: 'Compliance Reports', description: 'Generate regulatory compliance reports' },
  ],
  government: [
    { id: 'employee_attendance', label: 'Employee Attendance', description: 'Track government worker attendance' },
    { id: 'biometric_audit', label: 'Biometric Audit Trail', description: 'Maintain secure audit logs' },
    { id: 'department_tracking', label: 'Department Tracking', description: 'Monitor by agency or department' },
    { id: 'compliance_reports', label: 'Compliance Reports', description: 'Generate required reports' },
    { id: 'visitor_management', label: 'Visitor Management', description: 'Track and verify visitors' },
  ],
  nonprofit: [
    { id: 'volunteer_tracking', label: 'Volunteer Tracking', description: 'Track volunteer hours and activities' },
    { id: 'event_attendance', label: 'Event Attendance', description: 'Monitor attendance at events' },
    { id: 'donor_tracking', label: 'Donor Engagement', description: 'Link attendance with donor activity' },
    { id: 'program_tracking', label: 'Program Tracking', description: 'Monitor beneficiary participation' },
    { id: 'impact_reports', label: 'Impact Reports', description: 'Generate reports for stakeholders' },
  ],
  other: [
    { id: 'member_tracking', label: 'Member Tracking', description: 'Track member attendance' },
    { id: 'visitor_management', label: 'Visitor Management', description: 'Record and manage visitors' },
    { id: 'event_attendance', label: 'Event Attendance', description: 'Monitor event participation' },
    { id: 'department_tracking', label: 'Department Tracking', description: 'Track by department or group' },
    { id: 'custom_reports', label: 'Custom Reports', description: 'Generate customized reports' },
  ],
};

const rolesByType: Record<OrganizationType, string[]> = {
  church: ['Parish Pastor', 'Associate Pastor', 'Church Admin', 'Secretary', 'Head Usher'],
  corporate: ['CEO', 'HR Manager', 'Department Head', 'Office Manager', 'Admin'],
  school: ['Principal', 'Vice Principal', 'Admin Officer', 'Head Teacher', 'Registrar'],
  hospital: ['Medical Director', 'HR Manager', 'Department Head', 'Admin Officer', 'Shift Supervisor'],
  government: ['Department Head', 'HR Director', 'Admin Officer', 'Unit Supervisor', 'Records Officer'],
  nonprofit: ['Executive Director', 'Program Manager', 'Volunteer Coordinator', 'Admin', 'Office Manager'],
  other: ['Administrator', 'Manager', 'Supervisor', 'Coordinator', 'Other'],
};

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    organizationType: null,
    organizationName: '',
    industry: '',
    sizeRange: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    features: [],
    adminFirstName: '',
    adminLastName: '',
    adminRole: '',
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const totalSteps = 4;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    
    // Pre-fill admin name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, organization_id')
      .eq('id', session.user.id)
      .single();
    
    if (profile?.organization_id) {
      // Already onboarded, redirect to dashboard
      navigate('/dashboard');
      return;
    }
    
    if (profile) {
      setData(prev => ({
        ...prev,
        adminFirstName: profile.first_name || '',
        adminLastName: profile.last_name || '',
        email: profile.email || session.user.email || '',
      }));
    }
  };

  const handleTypeSelect = (type: OrganizationType) => {
    setData(prev => ({ ...prev, organizationType: type, features: [], adminRole: '' }));
  };

  const handleFeatureToggle = (featureId: string) => {
    setData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const handleSubmit = async () => {
    if (!data.organizationType || !data.organizationName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.organizationName,
          type: data.organizationType,
          industry: data.industry,
          size_range: data.sizeRange,
          address: data.address,
          city: data.city,
          country: data.country,
          phone: data.phone,
          email: data.email,
          website: data.website,
          features_enabled: data.features,
          onboarding_completed: true,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update profile with organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: org.id,
          first_name: data.adminFirstName,
          last_name: data.adminLastName,
        })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      // Assign admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: session.user.id,
          role: 'super_admin',
          organization_id: org.id,
        });

      if (roleError) throw roleError;

      toast({
        title: 'Setup Complete!',
        description: 'Your organization is ready. Welcome to Mispar Technologies!',
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message || 'An error occurred during setup.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!data.organizationType;
      case 2: return !!data.organizationName && !!data.sizeRange;
      case 3: return data.features.length > 0;
      case 4: return !!data.adminFirstName && !!data.adminLastName && !!data.adminRole;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Scan className="w-10 h-10 text-primary" />
            <span className="text-3xl font-bold text-foreground">Mispar Technologies</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Set Up Your Organization
          </h1>
          <p className="text-muted-foreground">
            Let's personalize your face recognition attendance system
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}% Complete</span>
          </div>
          <Progress value={(step / totalSteps) * 100} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  What type of organization are you?
                </CardTitle>
                <CardDescription>
                  This helps us customize the experience for your specific needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {organizationTypes.map(({ type, label, icon: Icon, description }) => (
                    <button
                      key={type}
                      onClick={() => handleTypeSelect(type)}
                      className={`p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50 ${
                        data.organizationType === type
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <Icon className={`w-8 h-8 mb-3 ${
                        data.organizationType === type ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <h3 className="font-semibold text-foreground mb-1">{label}</h3>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Organization Details
                </CardTitle>
                <CardDescription>
                  Tell us more about your {organizationTypes.find(o => o.type === data.organizationType)?.label.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="orgName">Organization Name *</Label>
                    <Input
                      id="orgName"
                      value={data.organizationName}
                      onChange={(e) => setData(prev => ({ ...prev, organizationName: e.target.value }))}
                      placeholder={data.organizationType === 'church' ? 'e.g., Grace Community Church' : 'e.g., Acme Corporation'}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Staff/Member Size *</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sizeRanges.map(size => (
                        <Button
                          key={size}
                          type="button"
                          variant={data.sizeRange === size ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setData(prev => ({ ...prev, sizeRange: size }))}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {data.organizationType !== 'church' && (
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={data.industry}
                        onChange={(e) => setData(prev => ({ ...prev, industry: e.target.value }))}
                        placeholder="e.g., Technology, Healthcare"
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={data.address}
                      onChange={(e) => setData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Street address"
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={data.city}
                      onChange={(e) => setData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="e.g., Lagos"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={data.country}
                      onChange={(e) => setData(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="e.g., Nigeria"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={data.phone}
                      onChange={(e) => setData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+234..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={data.website}
                      onChange={(e) => setData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && data.organizationType && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  Select Features
                </CardTitle>
                <CardDescription>
                  Choose the features you want to enable for your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featuresByType[data.organizationType].map(feature => (
                    <button
                      key={feature.id}
                      onClick={() => handleFeatureToggle(feature.id)}
                      className={`p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50 ${
                        data.features.includes(feature.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          data.features.includes(feature.id)
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        }`}>
                          {data.features.includes(feature.id) && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{feature.label}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </>
          )}

          {step === 4 && data.organizationType && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Admin Setup
                </CardTitle>
                <CardDescription>
                  Set up your administrator profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={data.adminFirstName}
                      onChange={(e) => setData(prev => ({ ...prev, adminFirstName: e.target.value }))}
                      placeholder="John"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={data.adminLastName}
                      onChange={(e) => setData(prev => ({ ...prev, adminLastName: e.target.value }))}
                      placeholder="Doe"
                      className="mt-1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Your Role *</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {rolesByType[data.organizationType].map(role => (
                        <Button
                          key={role}
                          type="button"
                          variant={data.adminRole === role ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setData(prev => ({ ...prev, adminRole: role }))}
                        >
                          {role}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-8 p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold text-foreground mb-3">Setup Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Organization:</span>
                      <span className="font-medium">{data.organizationName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium capitalize">{data.organizationType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span className="font-medium">{data.sizeRange} members</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Features:</span>
                      <span className="font-medium">{data.features.length} selected</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(s => Math.min(totalSteps, s + 1))}
              disabled={!canProceed()}
              className="gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isLoading}
              className="gap-2"
            >
              {isLoading ? 'Setting up...' : 'Complete Setup'}
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
