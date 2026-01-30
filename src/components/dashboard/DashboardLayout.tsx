import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';
import { TerminologyProvider } from '@/contexts/TerminologyContext';
import { useFaceEnrollmentGuard } from '@/hooks/useFaceEnrollmentGuard';

const DashboardLayout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check face enrollment status
  const { isEnrolled, isLoading: enrollmentLoading } = useFaceEnrollmentGuard(user?.id);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/auth');
      } else {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/auth');
      } else {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  // Redirect to enrollment if not enrolled (but not if already on enrollment page)
  useEffect(() => {
    if (!enrollmentLoading && isEnrolled === false && location.pathname !== '/dashboard/face-enrollment') {
      navigate('/dashboard/face-enrollment');
    }
  }, [isEnrolled, enrollmentLoading, location.pathname, navigate]);

  if (loading || enrollmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If on enrollment page, render simplified layout
  if (location.pathname === '/dashboard/face-enrollment') {
    return (
      <TerminologyProvider organizationId={profile?.organization_id}>
        <div className="min-h-screen bg-muted/30">
          <DashboardHeader 
            user={user} 
            profile={profile}
            onMenuToggle={() => {}}
          />
          <main className="p-4 lg:p-6 mt-16">
            <Outlet context={{ user, profile, session }} />
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
            user={user} 
            profile={profile}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />
          
          <main className="p-4 lg:p-6 mt-16">
            <Outlet context={{ user, profile, session }} />
          </main>
        </div>
      </div>
    </TerminologyProvider>
  );
};

export default DashboardLayout;
