import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  Calendar, 
  Building2, 
  ScanFace, 
  FileText, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Image,
  ClipboardList,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentPath: string;
  profile: any;
}

const DashboardSidebar = ({ isOpen, onToggle, currentPath, profile }: DashboardSidebarProps) => {
  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      href: '/dashboard',
      roles: ['super_admin', 'admin', 'parish_pastor', 'department_head', 'member']
    },
    { 
      label: 'Mark Attendance', 
      icon: ScanFace, 
      href: '/dashboard/attendance',
      roles: ['super_admin', 'admin', 'usher_admin', 'ushering_head_admin']
    },
    { 
      label: 'Attendance Logs', 
      icon: ClipboardList, 
      href: '/dashboard/attendance-logs',
      roles: ['super_admin', 'admin', 'parish_pastor', 'department_head', 'ushering_head_admin']
    },
    { 
      label: 'Members', 
      icon: Users, 
      href: '/dashboard/members',
      roles: ['super_admin', 'admin', 'parish_pastor', 'ushering_head_admin']
    },
    { 
      label: 'Temporary Members', 
      icon: UserPlus, 
      href: '/dashboard/temp-members',
      roles: ['super_admin', 'admin', 'parish_pastor', 'ushering_head_admin']
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
      href: '/dashboard/gallery',
      roles: ['super_admin', 'admin', 'parish_pastor']
    },
    { 
      label: 'Reports', 
      icon: FileText, 
      href: '/dashboard/reports',
      roles: ['super_admin', 'admin', 'parish_pastor', 'department_head']
    },
    { 
      label: 'My Profile', 
      icon: UserCheck, 
      href: '/dashboard/profile',
      roles: ['super_admin', 'admin', 'parish_pastor', 'department_head', 'member', 'usher_admin', 'ushering_head_admin']
    },
    { 
      label: 'Settings', 
      icon: Settings, 
      href: '/dashboard/settings',
      roles: ['super_admin', 'admin']
    },
  ];

  const userRole = profile?.role || 'member';
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
              <span className="text-xl font-bold text-foreground">FaceSync</span>
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
            const isActive = currentPath === item.href || 
              (item.href !== '/dashboard' && currentPath.startsWith(item.href));
            
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
        {isOpen && profile && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Logged in as</p>
              <p className="text-sm font-medium text-foreground capitalize">
                {profile.role?.replace('_', ' ') || 'Member'}
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
            <span className="text-xl font-bold text-foreground">FaceSync</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href || 
              (item.href !== '/dashboard' && currentPath.startsWith(item.href));
            
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
      </aside>
    </>
  );
};

export default DashboardSidebar;
