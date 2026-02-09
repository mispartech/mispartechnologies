import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/lib/isUuid';
import DashboardHome from './DashboardHome';
import MemberDashboard from './MemberDashboard';

interface DashboardContext {
  user: any;
  profile: any;
  session: any;
}

// Admin roles that should see the admin dashboard
const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'parish_pastor',
  'secretary',
  'ushering_head_admin',
  'usher_admin',
  'department_head'
];

const DashboardRouter = () => {
  const context = useOutletContext<DashboardContext>();
  const { profile } = context;
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      // If profile.id is not a UUID (Django integer ID), use profile.role directly
      if (!isUuid(profile.id)) {
        setUserRole(profile.role || 'member');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .single();

        if (data && !error) {
          setUserRole(data.role);
        } else {
          setUserRole(profile.role || 'member');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(profile.role || 'member');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [profile?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has admin role
  const isAdmin = userRole && ADMIN_ROLES.includes(userRole);

  // Render appropriate dashboard based on role
  if (isAdmin) {
    return <DashboardHome />;
  }

  return <MemberDashboard />;
};

export default DashboardRouter;
