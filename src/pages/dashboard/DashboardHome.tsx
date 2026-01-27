import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import StatsCard from '@/components/dashboard/StatsCard';
import AttendanceChart from '@/components/dashboard/AttendanceChart';
import AttendanceHeatmap from '@/components/dashboard/AttendanceHeatmap';
import { useTerminology } from '@/contexts/TerminologyContext';
import { 
  Users, 
  UserCheck, 
  Building2, 
  Clock, 
  TrendingUp,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardContext {
  user: any;
  profile: any;
  session: any;
}

const DashboardHome = () => {
  const { profile } = useOutletContext<DashboardContext>();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalAdmins: 0,
    totalDepartments: 0,
    attendedToday: 0,
    averageAttendance: 0,
  });
  const [organization, setOrganization] = useState<any>(null);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { personPlural, getTerm } = useTerminology();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Fetch organization data first if we have organization_id
      if (profile?.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();
        setOrganization(orgData);
      }
      
      // Fetch stats in parallel
      const [
        { count: membersCount },
        { count: adminsCount },
        { count: departmentsCount },
        { count: attendedTodayCount },
        { data: recentAttendanceData },
        { data: recentMembersData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'member'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'member'),
        supabase.from('departments').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today),
        supabase.from('attendance').select('*, profiles(first_name, last_name, face_image_url)').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('*').eq('role', 'member').order('created_at', { ascending: false }).limit(5)
      ]);

      setStats({
        totalMembers: membersCount || 0,
        totalAdmins: adminsCount || 0,
        totalDepartments: departmentsCount || 0,
        attendedToday: attendedTodayCount || 0,
        averageAttendance: 0,
      });

      setRecentAttendance(recentAttendanceData || []);
      setRecentMembers(recentMembersData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome message with organization context */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {profile?.first_name || 'User'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your attendance system today.
            </p>
          </div>
          {organization && (
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">{organization.name}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="capitalize">{organization.type?.replace('_', ' ')}</Badge>
                {organization.size_range && (
                  <Badge variant="outline">{organization.size_range}</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={`Total ${getTerm('plural', true)}`}
          value={stats.totalMembers}
          subtitle={`Registered ${personPlural}`}
          icon={Users}
          iconClassName="bg-blue-500"
        />
        <StatsCard
          title="Attended Today"
          value={stats.attendedToday}
          subtitle={format(new Date(), 'EEEE, MMM d')}
          icon={UserCheck}
          iconClassName="bg-green-500"
        />
        <StatsCard
          title="Departments"
          value={stats.totalDepartments}
          subtitle="Active departments"
          icon={Building2}
          iconClassName="bg-purple-500"
        />
        <StatsCard
          title="Admins"
          value={stats.totalAdmins}
          subtitle="System administrators"
          icon={TrendingUp}
          iconClassName="bg-orange-500"
        />
      </div>

      {/* Attendance Chart */}
      <AttendanceChart organizationId={profile?.organization_id} showVisitors={true} />

      {/* Attendance Heatmap */}
      <AttendanceHeatmap organizationId={profile?.organization_id} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Attendance</CardTitle>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No attendance records yet
              </p>
            ) : (
              <div className="space-y-4">
                {recentAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={record.profiles?.face_image_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {record.profiles?.first_name?.[0] || 'U'}
                          {record.profiles?.last_name?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {record.profiles?.first_name} {record.profiles?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.date} at {record.time}
                        </p>
                      </div>
                    </div>
                    {record.confidence_score && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(record.confidence_score * 100)}% match
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent {getTerm('plural', true)}</CardTitle>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {recentMembers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No {personPlural} registered yet
              </p>
            ) : (
              <div className="space-y-4">
                {recentMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.face_image_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.first_name?.[0] || 'U'}
                          {member.last_name?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">
                      {member.role?.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickActionCard
              icon={CalendarIcon}
              label="Mark Attendance"
              href="/dashboard/attendance"
            />
            <QuickActionCard
              icon={Users}
              label={`View ${getTerm('plural', true)}`}
              href="/dashboard/members"
            />
            <QuickActionCard
              icon={Building2}
              label="Departments"
              href="/dashboard/departments"
            />
            <QuickActionCard
              icon={TrendingUp}
              label="Reports"
              href="/dashboard/reports"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const QuickActionCard = ({ 
  icon: Icon, 
  label, 
  href 
}: { 
  icon: any; 
  label: string; 
  href: string;
}) => {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
    >
      <Icon className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </a>
  );
};

export default DashboardHome;
