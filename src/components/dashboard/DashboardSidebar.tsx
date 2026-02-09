import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Building2, 
  ScanFace, 
  FileText, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Image,
  ClipboardList,
  UserCheck,
  Shield,
  Activity,
  CalendarClock,
  Globe,
  Calendar,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useTerminology } from '@/contexts/TerminologyContext';
import { isUuid } from '@/lib/isUuid';

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentPath: string;
  profile: any;
}

const DashboardSidebar = ({ isOpen, onToggle, currentPath, profile }: DashboardSidebarProps) => {
  const [userRole, setUserRole] = useState<string>('member');
  const { getTerm } = useTerminology();

  // Fetch the actual role from user_roles table (not profiles.role)
  // Use Django role directly if profile.id is not a UUID (Django integer ID)
  useEffect(() => {
    if (!profile?.id) return;

    // If profile.id is not a UUID, fall back to profile.role from Django
    if (!isUuid(profile.id)) {
      if (profile.role) setUserRole(profile.role);
      return;
    }

    const fetchUserRole = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.id)
        .single();
      
      if (data && !error) {
        setUserRole(data.role);
      }
    };

    fetchUserRole();
  }, [profile?.id, profile?.role]);

  // Dynamic label based on organization type
  const getMembersLabel = () => getTerm('plural', true);
  const getTempMembersLabel = () => `Temporary ${getTerm('plural', true)}`;

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      href: '/dashboard',
      roles: ['super_admin', 'admin', 'manager', 'member', 'parish_pastor', 'secretary', 'usher', 'department_head', 'ushering_head_admin', 'usher_admin']
    },
    { 
      label: 'My Attendance', 
      icon: Calendar, 
      href: '/dashboard/my-attendance',
      roles: ['member']
    },
    { 
      label: 'Mark Attendance', 
      icon: ScanFace, 
      href: '/dashboard/attendance',
      roles: ['super_admin', 'admin', 'manager', 'usher', 'secretary', 'ushering_head_admin', 'usher_admin']
    },
    { 
      label: 'Attendance Logs', 
      icon: ClipboardList, 
      href: '/dashboard/attendance-logs',
      roles: ['super_admin', 'admin', 'manager', 'parish_pastor', 'secretary', 'department_head']
    },
    { 
      label: 'Attendance History', 
      icon: History, 
      href: '/dashboard/attendance-history',
      roles: ['super_admin', 'admin', 'manager', 'parish_pastor', 'secretary', 'department_head', 'ushering_head_admin', 'usher_admin']
    },
    { 
      label: getMembersLabel(), 
      icon: Users, 
      href: '/dashboard/members',
      roles: ['super_admin', 'admin', 'manager', 'parish_pastor', 'secretary', 'department_head'],
      isDynamic: true
    },
    { 
      label: getTempMembersLabel(), 
      icon: UserPlus, 
      href: '/dashboard/temp-members',
      roles: ['super_admin', 'admin', 'manager', 'secretary'],
      isDynamic: true
    },
    { 
      label: 'Departments', 
      icon: Building2, 
      href: '/dashboard/departments',
      roles: ['super_admin', 'admin', 'parish_pastor']
    },
    { 
      label: 'Face Gallery', 
      icon: Image, 
      href: '/dashboard/face-gallery',
      roles: ['super_admin', 'admin', 'parish_pastor']
    },
    { 
      label: 'Reports', 
      icon: FileText, 
      href: '/dashboard/reports',
      roles: ['super_admin', 'admin', 'manager', 'parish_pastor', 'department_head']
    },
    { 
      label: 'My Profile', 
      icon: UserCheck, 
      href: '/dashboard/profile',
      roles: ['super_admin', 'admin', 'manager', 'member', 'parish_pastor', 'secretary', 'usher', 'department_head', 'ushering_head_admin', 'usher_admin']
    },
    { 
      label: 'Admin Management', 
      icon: Shield, 
      href: '/dashboard/admin-management',
      roles: ['super_admin']
    },
    { 
      label: 'Activity Logs', 
      icon: Activity, 
      href: '/dashboard/activity-logs',
      roles: ['super_admin', 'admin']
    },
    { 
      label: 'Schedules', 
      icon: CalendarClock, 
      href: '/dashboard/schedules',
      roles: ['super_admin', 'admin', 'parish_pastor']
    },
    { 
      label: 'Site Management', 
      icon: Globe, 
      href: '/dashboard/site-management',
      roles: ['super_admin', 'admin']
    },
    { 
      label: 'Settings', 
      icon: Settings, 
      href: '/dashboard/settings',
      roles: ['super_admin', 'admin']
    },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-card border-r border-border transition-all duration-300",
          isOpen ? "w-64" : "w-20",
          "hidden lg:block"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {isOpen ? (
            <Link to="/dashboard" className="flex items-center gap-2">
              <ScanFace className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold text-foreground">Mispar Technologies</span>
            </Link>
          ) : (
            <Link to="/dashboard" className="mx-auto">
              <ScanFace className="w-8 h-8 text-primary" />
            </Link>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 bg-primary text-primary-foreground rounded-full p-1 shadow-md hover:bg-primary/90 transition-colors"
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
        {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            // Fix: Use exact match only - don't use startsWith to avoid multiple active items
            const isActive = currentPath === item.href;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  !isOpen && "justify-center"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User role badge */}
        {isOpen && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Logged in as</p>
              <p className="text-sm font-medium text-foreground capitalize">
                {userRole.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transition-transform duration-300 lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <ScanFace className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Mispar Technologies</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
        {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            // Fix: Use exact match only - don't use startsWith to avoid multiple active items
            const isActive = currentPath === item.href;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onToggle}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User role badge */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Logged in as</p>
            <p className="text-sm font-medium text-foreground capitalize">
              {userRole.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
