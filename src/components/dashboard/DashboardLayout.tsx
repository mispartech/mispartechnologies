import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDjangoAuth } from '@/contexts/DjangoAuthContext';
import { djangoApi } from '@/lib/api/client';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import { TerminologyProvider } from '@/contexts/TerminologyContext';
import { useFaceEnrollmentGuard } from '@/hooks/useFaceEnrollmentGuard';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use Django auth as primary
  const { user: djangoUser, isLoading: djangoLoading, isAuthenticated } = useDjangoAuth();
  
  // Fallback profile state for Supabase compatibility during transition
  const [profile, setProfile] = useState<any>(null);

  // Check face enrollment status using Django user ID
  const { isEnrolled, isLoading: enrollmentLoading } = useFaceEnrollmentGuard(djangoUser?.id);

  useEffect(() => {
    const initializeAuth = async () => {
      // If Django auth is ready and authenticated, use Django user
      if (!djangoLoading && isAuthenticated && djangoUser) {
        // Map Django user to profile format for compatibility
        setProfile({
          id: djangoUser.id,
          email: djangoUser.email,
          first_name: djangoUser.first_name,
          last_name: djangoUser.last_name,
          role: djangoUser.role,
          organization_id: djangoUser.organization_id,
          department_id: djangoUser.department_id,
          face_image_url: djangoUser.face_image_url,
          phone_number: djangoUser.phone_number,
          gender: djangoUser.gender,
        });
        setLoading(false);
        return;
      }

      // Fallback: Check Supabase session for existing users (Phase 1 bridge)
      if (!djangoLoading && !isAuthenticated) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          navigate('/auth');
          return;
        }

        // Try to sync Supabase user to Django
        const syncResult = await djangoApi.syncFromSupabase({
          supabase_uid: session.user.id,
          email: session.user.email || '',
          first_name: session.user.user_metadata?.first_name || '',
          last_name: session.user.user_metadata?.last_name || '',
        });

        if (syncResult.data?.user) {
          setProfile({
            id: syncResult.data.user.id,
            email: syncResult.data.user.email,
            first_name: syncResult.data.user.first_name,
            last_name: syncResult.data.user.last_name,
            role: syncResult.data.user.role,
            organization_id: syncResult.data.user.organization_id,
          });
        } else {
          // Sync failed - fetch from Supabase as last resort
          const { data: supabaseProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (supabaseProfile) {
            setProfile(supabaseProfile);
          }
        }
        
        setLoading(false);
      }
    };

    initializeAuth();
  }, [djangoLoading, isAuthenticated, djangoUser, navigate]);

  // Redirect to enrollment if not enrolled (but not if already on enrollment page)
  useEffect(() => {
    if (!enrollmentLoading && isEnrolled === false && location.pathname !== '/dashboard/face-enrollment') {
      navigate('/dashboard/face-enrollment');
    }
  }, [isEnrolled, enrollmentLoading, location.pathname, navigate]);

  if (loading || djangoLoading || enrollmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!djangoUser && !profile) {
    return null;
  }

  // Create a mock user object for components expecting Supabase User type
  const mockUser = {
    id: profile?.id || djangoUser?.id || '',
    email: profile?.email || djangoUser?.email || '',
    app_metadata: {},
    user_metadata: {
      first_name: profile?.first_name || djangoUser?.first_name,
      last_name: profile?.last_name || djangoUser?.last_name,
    },
    aud: 'authenticated',
    created_at: '',
  };

  // If on enrollment page, render simplified layout
  if (location.pathname === '/dashboard/face-enrollment') {
    return (
      <TerminologyProvider organizationId={profile?.organization_id}>
        <div className="min-h-screen bg-muted/30">
          <DashboardHeader 
            user={mockUser as any} 
            profile={profile}
            onMenuToggle={() => {}}
          />
          <main className="p-4 lg:p-6 mt-16">
            <Outlet context={{ user: mockUser, profile, session: null }} />
          </main>
        </div>
      </TerminologyProvider>
    );
  }

  return (
    <TerminologyProvider organizationId={profile?.organization_id}>
      <div className="min-h-screen bg-muted/30">
        <DashboardSidebar 
          isOpen={sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          currentPath={location.pathname}
          profile={profile}
        />
        
        <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <DashboardHeader 
            user={mockUser as any} 
            profile={profile}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />
          
          <main className="p-4 lg:p-6 mt-16">
            <Outlet context={{ user: mockUser, profile, session: null }} />
          </main>
        </div>
      </div>
    </TerminologyProvider>
  );
};

export default DashboardLayout;
