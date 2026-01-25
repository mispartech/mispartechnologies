import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Route to title mapping
const routeTitles: Record<string, string> = {
  '/': 'Mispar Technologies - Facial Recognition Solutions',
  '/auth': 'Login | Mispar Technologies',
  '/onboarding': 'Get Started | Mispar Technologies',
  '/register': 'Register | Mispar Technologies',
  '/dashboard': 'Dashboard | Mispar Technologies',
  '/dashboard/members': 'Members | Mispar Technologies',
  '/dashboard/temp-members': 'Temporary Members | Mispar Technologies',
  '/dashboard/attendance': 'Mark Attendance | Mispar Technologies',
  '/dashboard/attendance-logs': 'Attendance Logs | Mispar Technologies',
  '/dashboard/departments': 'Departments | Mispar Technologies',
  '/dashboard/profile': 'My Profile | Mispar Technologies',
  '/dashboard/face-gallery': 'Face Gallery | Mispar Technologies',
  '/dashboard/reports': 'Reports | Mispar Technologies',
  '/dashboard/settings': 'Organization Settings | Mispar Technologies',
  '/dashboard/admin-management': 'Admin Management | Mispar Technologies',
  '/dashboard/activity-logs': 'Activity Logs | Mispar Technologies',
  '/dashboard/schedules': 'Schedules | Mispar Technologies',
  '/dashboard/site-management': 'Site Management | Mispar Technologies',
};

export const useDocumentTitle = (customTitle?: string) => {
  const location = useLocation();

  useEffect(() => {
    const title = customTitle || routeTitles[location.pathname] || 'Mispar Technologies';
    document.title = title;
  }, [location.pathname, customTitle]);
};

export default useDocumentTitle;
