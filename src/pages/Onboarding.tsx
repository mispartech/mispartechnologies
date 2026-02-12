import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client'; // still needed for onboarding session persistence
import { useDjangoAuth } from '@/contexts/DjangoAuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  deleteOnboardingSession,
  getOnboardingStorageKeys,
  loadOnboardingSession,
  saveOnboardingSession,
} from '@/lib/onboardingSession';
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
  Scan,
  Calendar,
  Clock,
  Plus,
  Trash2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type OrganizationType = 'church' | 'corporate' | 'school' | 'hospital' | 'government' | 'nonprofit' | 'other';

interface ServiceSchedule {
  id: string;
  name: string;
  description: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

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
  serviceSchedules: ServiceSchedule[];
}

const defaultData: OnboardingData = {
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
  serviceSchedules: [],
};

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

const daysOfWeek = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// Default schedules based on organization type
const defaultSchedulesByType: Record<OrganizationType, ServiceSchedule[]> = {
  church: [
    { id: '1', name: 'Sunday Service', description: 'Main worship service', dayOfWeek: 0, startTime: '08:00', endTime: '11:00', isActive: true },
    { id: '2', name: 'Midweek Service', description: 'Wednesday Bible study', dayOfWeek: 3, startTime: '18:00', endTime: '20:00', isActive: true },
  ],
  corporate: [
    { id: '1', name: 'Weekday Work', description: 'Regular work hours', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
    { id: '2', name: 'Weekday Work', description: 'Regular work hours', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isActive: true },
    { id: '3', name: 'Weekday Work', description: 'Regular work hours', dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isActive: true },
    { id: '4', name: 'Weekday Work', description: 'Regular work hours', dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isActive: true },
    { id: '5', name: 'Weekday Work', description: 'Regular work hours', dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isActive: true },
  ],
  school: [
    { id: '1', name: 'School Day', description: 'Regular classes', dayOfWeek: 1, startTime: '08:00', endTime: '15:00', isActive: true },
    { id: '2', name: 'School Day', description: 'Regular classes', dayOfWeek: 2, startTime: '08:00', endTime: '15:00', isActive: true },
    { id: '3', name: 'School Day', description: 'Regular classes', dayOfWeek: 3, startTime: '08:00', endTime: '15:00', isActive: true },
    { id: '4', name: 'School Day', description: 'Regular classes', dayOfWeek: 4, startTime: '08:00', endTime: '15:00', isActive: true },
    { id: '5', name: 'School Day', description: 'Regular classes', dayOfWeek: 5, startTime: '08:00', endTime: '15:00', isActive: true },
  ],
  hospital: [
    { id: '1', name: 'Day Shift', description: 'Morning to afternoon', dayOfWeek: 1, startTime: '07:00', endTime: '19:00', isActive: true },
  ],
  government: [
    { id: '1', name: 'Office Hours', description: 'Regular work day', dayOfWeek: 1, startTime: '08:00', endTime: '16:00', isActive: true },
  ],
  nonprofit: [
    { id: '1', name: 'Office Day', description: 'Regular operations', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
  ],
  other: [
    { id: '1', name: 'Default Schedule', description: 'Standard hours', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
  ],
};

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

// Dynamic labels based on organization type
const getScheduleLabel = (type: OrganizationType | null) => {
  switch (type) {
    case 'church': return 'Service Days & Times';
    case 'corporate': return 'Work Schedule';
    case 'school': return 'Class Schedule';
    case 'hospital': return 'Shift Schedule';
    default: return 'Attendance Schedule';
  }
};

const getScheduleDescription = (type: OrganizationType | null) => {
  switch (type) {
    case 'church': return 'Configure when services are held for attendance tracking';
    case 'corporate': return 'Set up work days and hours for employee attendance';
    case 'school': return 'Define school days and class hours';
    case 'hospital': return 'Configure shift timings for staff attendance';
    default: return 'Set up when attendance should be tracked';
  }
};

const getScheduleItemLabel = (type: OrganizationType | null) => {
  switch (type) {
    case 'church': return 'Service';
    case 'corporate': return 'Shift';
    case 'school': return 'Session';
    case 'hospital': return 'Shift';
    default: return 'Schedule';
  }
};

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>(defaultData);

  const navigate = useNavigate();
  const { toast } = useToast();
  const totalSteps = 5;
  const { isAuthenticated: djangoAuthenticated, user: djangoUser, isLoading: djangoLoading } = useDjangoAuth();

  const didHydrateRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const storageKeys = useMemo(() => {
    if (!userId) return null;
    return getOnboardingStorageKeys(userId);
  }, [userId]);

  useEffect(() => {
    if (djangoLoading) return;

    const run = async () => {
      setIsAuthLoading(true);

      // Must be authenticated via Supabase (DjangoAuthProvider uses Supabase session)
      if (!djangoAuthenticated || !djangoUser) {
        navigate('/auth', { replace: true });
        return;
      }

      // Already onboarded — go to dashboard
      const hasOrg = !!djangoUser.organization_id && djangoUser.organization_id !== 'null' && djangoUser.organization_id !== '';
      if (hasOrg) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // Authenticated user without org — allow onboarding
      setUserId(djangoUser.id);

      // Pre-fill admin info
      setData((prev) => ({
        ...prev,
        adminFirstName: prev.adminFirstName || djangoUser.first_name || '',
        adminLastName: prev.adminLastName || djangoUser.last_name || '',
        email: prev.email || djangoUser.email || '',
      }));

      // Try to restore onboarding session
      try {
        const persisted = await loadOnboardingSession(djangoUser.id);
        if (persisted && !didHydrateRef.current) {
          didHydrateRef.current = true;
          setStep(Math.min(5, Math.max(1, persisted.step || 1)));
          setData((prev) => ({ ...prev, ...(persisted.data as Partial<OnboardingData>) }));
        }
      } catch (e) {
        console.warn('Failed to load onboarding session from backend:', e);
      }

      if (storageKeys && !didHydrateRef.current) {
        try {
          const savedData = sessionStorage.getItem(storageKeys.data);
          const savedStep = sessionStorage.getItem(storageKeys.step);
          if (savedData) setData((prev) => ({ ...prev, ...JSON.parse(savedData) }));
          if (savedStep) {
            const n = parseInt(savedStep, 10);
            if (!Number.isNaN(n)) setStep(Math.min(5, Math.max(1, n)));
          }
        } catch (e) {
          console.warn('Failed to load onboarding session from sessionStorage:', e);
        }
      }

      setIsAuthLoading(false);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, djangoLoading, djangoAuthenticated, djangoUser]);

  useEffect(() => {
    if (!userId || !storageKeys || isAuthLoading) return;

    try {
      sessionStorage.setItem(storageKeys.data, JSON.stringify(data));
      sessionStorage.setItem(storageKeys.step, String(step));
    } catch {
      // ignore
    }

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveOnboardingSession(userId, { step, data: data as unknown as Record<string, unknown> }).catch((e) => {
        console.warn('Failed to save onboarding session:', e);
      });
    }, 500);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [data, step, userId, storageKeys, isAuthLoading]);

  const handleTypeSelect = (type: OrganizationType) => {
    const defaultSchedules = defaultSchedulesByType[type] || [];
    setData(prev => ({ 
      ...prev, 
      organizationType: type, 
      features: [], 
      adminRole: '',
      serviceSchedules: defaultSchedules,
    }));
  };

  const handleFeatureToggle = (featureId: string) => {
    setData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const handleAddSchedule = () => {
    const newSchedule: ServiceSchedule = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '17:00',
      isActive: true,
    };
    setData(prev => ({
      ...prev,
      serviceSchedules: [...prev.serviceSchedules, newSchedule],
    }));
  };

  const handleRemoveSchedule = (id: string) => {
    setData(prev => ({
      ...prev,
      serviceSchedules: prev.serviceSchedules.filter(s => s.id !== id),
    }));
  };

  const handleScheduleChange = (id: string, field: keyof ServiceSchedule, value: any) => {
    setData(prev => ({
      ...prev,
      serviceSchedules: prev.serviceSchedules.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      ),
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
      const user = session?.user;
      if (!user) throw new Error('You are not logged in. Please sign in again and retry.');

      const orgId = crypto.randomUUID();

      const { error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: orgId,
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
        } as never);

      if (orgError) throw orgError;

      // Use upsert to handle both cases: profile exists or needs creation
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          organization_id: orgId,
          first_name: data.adminFirstName,
          last_name: data.adminLastName,
          role: 'admin', // Legacy field for display purposes
        }, { onConflict: 'id' });

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'super_admin',
          organization_id: orgId,
        });

      if (roleError) throw roleError;

      // Insert service schedules
      if (data.serviceSchedules.length > 0) {
        const schedules = data.serviceSchedules.map(s => ({
          organization_id: orgId,
          name: s.name || getScheduleItemLabel(data.organizationType),
          description: s.description,
          day_of_week: s.dayOfWeek,
          start_time: s.startTime,
          end_time: s.endTime,
          is_active: s.isActive,
        }));

        const { error: scheduleError } = await supabase
          .from('service_schedules')
          .insert(schedules as never);

        if (scheduleError) {
          console.warn('Failed to insert schedules:', scheduleError);
        }
      }

      try {
        await deleteOnboardingSession(user.id);
      } catch {
        // ignore cleanup errors
      }
      if (storageKeys) {
        sessionStorage.removeItem(storageKeys.data);
        sessionStorage.removeItem(storageKeys.step);
      }

      toast({
        title: 'Setup Complete!',
        description: 'Your organization is ready. Welcome to Mispar Technologies!',
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Onboarding error:', error);

      const code = error?.code as string | undefined;
      const status = error?.status as number | undefined;

      let description =
        error?.message ||
        'We could not complete setup. Please try again.';

      if (code === '42501' || status === 403) {
        description =
          "Setup couldn't create your organization due to a permissions rule. "
          + 'This usually happens if your session is missing/expired, or if the backend policy blocks the insert. '
          + 'Please sign out and sign back in, then retry. If it still fails, contact support.';
      }

      toast({
        title: 'Setup Failed',
        description,
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
      case 4: return data.serviceSchedules.length > 0 && data.serviceSchedules.every(s => s.name && s.startTime && s.endTime);
      case 5: return !!data.adminFirstName && !!data.adminLastName && !!data.adminRole;
      default: return false;
    }
  };

  // Show loading spinner while checking auth — prevents flash of onboarding form
  if (djangoLoading || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="bg-gradient-to-br from-background via-background to-primary/5 px-4 pt-28 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Scan className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">Mispar Technologies</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-1">Set Up Your Organization</h1>
            <p className="text-sm text-muted-foreground">Let's personalize your face recognition attendance system</p>
          </header>

          {/* Progress */}
          <section className="mb-6" aria-label="Onboarding progress">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round((step / totalSteps) * 100)}% Complete</span>
            </div>
            <Progress value={(step / totalSteps) * 100} className="h-1.5" />
          </section>

          {/* Step Content */}
          <Card className="mb-6 border border-border/50 shadow-sm">
            {/* Step 1: Organization Type */}
            {step === 1 && (
              <>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Building2 className="w-4 h-4 text-primary" />
                    What type of organization are you?
                  </CardTitle>
                  <CardDescription className="text-xs">This helps us customize the experience for your specific needs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {organizationTypes.map(({ type, label, icon: Icon, description }) => (
                      <button
                        key={type}
                        onClick={() => handleTypeSelect(type)}
                        className={`p-4 rounded-lg border text-left transition-all hover:border-primary/50 hover:shadow-sm ${
                          data.organizationType === type
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border/60 bg-card'
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 mb-2 ${
                            data.organizationType === type ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        />
                        <h3 className="text-sm font-medium text-foreground mb-0.5">{label}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 2: Organization Details */}
            {step === 2 && (
              <>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Settings className="w-4 h-4 text-primary" />
                    Organization Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tell us more about your {organizationTypes.find(o => o.type === data.organizationType)?.label.toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="orgName" className="text-sm font-medium">Organization Name *</Label>
                      <Input
                        id="orgName"
                        value={data.organizationName}
                        onChange={(e) => setData(prev => ({ ...prev, organizationName: e.target.value }))}
                        placeholder={data.organizationType === 'church' ? 'e.g., Grace Community Church' : 'e.g., Acme Corporation'}
                        className="mt-1.5 h-9"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium">Staff/Member Size *</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {sizeRanges.map(size => (
                          <Button
                            key={size}
                            type="button"
                            variant={data.sizeRange === size ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setData(prev => ({ ...prev, sizeRange: size }))}
                            className="h-8 text-xs px-3"
                          >
                            {size}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {data.organizationType !== 'church' && (
                      <div>
                        <Label htmlFor="industry" className="text-sm font-medium">Industry</Label>
                        <Input
                          id="industry"
                          value={data.industry}
                          onChange={(e) => setData(prev => ({ ...prev, industry: e.target.value }))}
                          placeholder="e.g., Technology, Healthcare"
                          className="mt-1.5 h-9"
                        />
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <Label htmlFor="address" className="text-sm font-medium">Address</Label>
                      <Textarea
                        id="address"
                        value={data.address}
                        onChange={(e) => setData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Street address"
                        className="mt-1.5 min-h-[60px] resize-none"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="city" className="text-sm font-medium">City</Label>
                      <Input
                        id="city"
                        value={data.city}
                        onChange={(e) => setData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="e.g., Lagos"
                        className="mt-1.5 h-9"
                      />
                    </div>

                    <div>
                      <Label htmlFor="country" className="text-sm font-medium">Country</Label>
                      <Input
                        id="country"
                        value={data.country}
                        onChange={(e) => setData(prev => ({ ...prev, country: e.target.value }))}
                        placeholder="e.g., Nigeria"
                        className="mt-1.5 h-9"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                      <Input
                        id="phone"
                        value={data.phone}
                        onChange={(e) => setData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+234..."
                        className="mt-1.5 h-9"
                      />
                    </div>

                    <div>
                      <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                      <Input
                        id="website"
                        value={data.website}
                        onChange={(e) => setData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://..."
                        className="mt-1.5 h-9"
                      />
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 3: Features */}
            {step === 3 && data.organizationType && (
              <>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Check className="w-4 h-4 text-primary" />
                    Select Features
                  </CardTitle>
                  <CardDescription className="text-xs">Choose the features you want to enable for your organization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {featuresByType[data.organizationType].map(feature => (
                      <button
                        key={feature.id}
                        onClick={() => handleFeatureToggle(feature.id)}
                        className={`p-4 rounded-lg border text-left transition-all hover:border-primary/50 hover:shadow-sm ${
                          data.features.includes(feature.id)
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border/60 bg-card'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              data.features.includes(feature.id)
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground/50'
                            }`}
                          >
                            {data.features.includes(feature.id) && (
                              <Check className="w-2.5 h-2.5 text-primary-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium text-foreground leading-tight">{feature.label}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feature.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 4: Service Schedule */}
            {step === 4 && data.organizationType && (
              <>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Calendar className="w-4 h-4 text-primary" />
                    {getScheduleLabel(data.organizationType)}
                  </CardTitle>
                  <CardDescription className="text-xs">{getScheduleDescription(data.organizationType)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.serviceSchedules.map((schedule, index) => (
                    <div key={schedule.id} className="p-4 rounded-lg border border-border/60 bg-card/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {getScheduleItemLabel(data.organizationType)} {index + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={schedule.isActive}
                              onCheckedChange={(checked) => handleScheduleChange(schedule.id, 'isActive', checked)}
                            />
                            <span className="text-xs text-muted-foreground">Active</span>
                          </div>
                          {data.serviceSchedules.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSchedule(schedule.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-medium">Name *</Label>
                          <Input
                            value={schedule.name}
                            onChange={(e) => handleScheduleChange(schedule.id, 'name', e.target.value)}
                            placeholder={data.organizationType === 'church' ? 'e.g., Sunday Service' : 'e.g., Morning Shift'}
                            className="mt-1 h-8 text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-medium">Day of Week *</Label>
                          <Select
                            value={String(schedule.dayOfWeek)}
                            onValueChange={(val) => handleScheduleChange(schedule.id, 'dayOfWeek', parseInt(val))}
                          >
                            <SelectTrigger className="mt-1 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {daysOfWeek.map(day => (
                                <SelectItem key={day.value} value={String(day.value)}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs font-medium">Start Time *</Label>
                          <div className="relative mt-1">
                            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              type="time"
                              value={schedule.startTime}
                              onChange={(e) => handleScheduleChange(schedule.id, 'startTime', e.target.value)}
                              className="h-8 text-sm pl-8"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-medium">End Time *</Label>
                          <div className="relative mt-1">
                            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              type="time"
                              value={schedule.endTime}
                              onChange={(e) => handleScheduleChange(schedule.id, 'endTime', e.target.value)}
                              className="h-8 text-sm pl-8"
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-xs font-medium">Description</Label>
                          <Input
                            value={schedule.description}
                            onChange={(e) => handleScheduleChange(schedule.id, 'description', e.target.value)}
                            placeholder="Optional description"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSchedule}
                    className="w-full h-10 text-sm gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add {getScheduleItemLabel(data.organizationType)}
                  </Button>
                </CardContent>
              </>
            )}

            {/* Step 5: Admin Setup */}
            {step === 5 && data.organizationType && (
              <>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Users className="w-4 h-4 text-primary" />
                    Admin Setup
                  </CardTitle>
                  <CardDescription className="text-xs">Set up your administrator profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-medium">First Name *</Label>
                      <Input
                        id="firstName"
                        value={data.adminFirstName}
                        onChange={(e) => setData(prev => ({ ...prev, adminFirstName: e.target.value }))}
                        placeholder="John"
                        className="mt-1.5 h-9"
                      />
                    </div>

                    <div>
                      <Label htmlFor="lastName" className="text-sm font-medium">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={data.adminLastName}
                        onChange={(e) => setData(prev => ({ ...prev, adminLastName: e.target.value }))}
                        placeholder="Doe"
                        className="mt-1.5 h-9"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium">Your Role *</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rolesByType[data.organizationType].map(role => (
                          <Button
                            key={role}
                            type="button"
                            variant={data.adminRole === role ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setData(prev => ({ ...prev, adminRole: role }))}
                            className="h-8 text-xs px-3"
                          >
                            {role}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Setup Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Organization:</span>
                        <span className="font-medium text-foreground">{data.organizationName}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium text-foreground capitalize">{data.organizationType}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="font-medium text-foreground">{data.sizeRange} members</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Features:</span>
                        <span className="font-medium text-foreground">{data.features.length} selected</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Schedules:</span>
                        <span className="font-medium text-foreground">{data.serviceSchedules.length} configured</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="gap-2 h-9 text-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button
                onClick={() => setStep(s => Math.min(totalSteps, s + 1))}
                disabled={!canProceed()}
                className="gap-2 h-9 text-sm"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isLoading}
                className="gap-2 h-9 text-sm"
              >
                {isLoading ? 'Setting up...' : 'Complete Setup'}
                <Check className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Onboarding;