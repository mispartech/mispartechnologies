import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { isUuid } from '@/lib/isUuid';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import StatsCard from '@/components/dashboard/StatsCard';
import AttendanceStreakTracker from '@/components/dashboard/AttendanceStreakTracker';
import AttendanceChart from '@/components/dashboard/AttendanceChart';
import AttendanceHeatmap from '@/components/dashboard/AttendanceHeatmap';
import { 
  Calendar,
  Clock, 
  CheckCircle2,
  XCircle,
  User,
  Building2,
  TrendingUp,
  CalendarDays,
  History
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday } from 'date-fns';

interface DashboardContext {
  user: any;
  profile: any;
  session: any;
}

const MemberDashboard = () => {
  const { profile, user } = useOutletContext<DashboardContext>();
  const [stats, setStats] = useState({
    totalAttendance: 0,
    thisMonth: 0,
    thisWeek: 0,
    attendedToday: false,
  });
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [department, setDepartment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchMemberData();
    }
  }, [profile?.id]);

  const fetchMemberData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

      // Fetch organization if available
      if (profile?.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single();
        setOrganization(orgData);
      }

      // Fetch department if available
      if (profile?.department_id) {
        const { data: deptData } = await supabase
          .from('departments')
          .select('*')
          .eq('id', profile.department_id)
          .single();
        setDepartment(deptData);
      }

      // Skip Supabase attendance queries if user ID is not a UUID (Django integer ID)
      if (!isUuid(profile.id)) {
        console.warn('[MemberDashboard] Skipping Supabase attendance queries: profile.id is not a UUID:', profile.id);
        setLoading(false);
        return;
      }

      // Fetch attendance stats for this member
      const [
        { count: totalCount },
        { count: monthCount },
        { count: weekCount },
        { count: todayCount },
        { data: recentData }
      ] = await Promise.all([
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).gte('date', monthStart).lte('date', monthEnd),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).gte('date', weekStart).lte('date', weekEnd),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('date', today),
        supabase.from('attendance').select('*').eq('user_id', profile.id).order('date', { ascending: false }).order('time', { ascending: false }).limit(10)
      ]);

      setStats({
        totalAttendance: totalCount || 0,
        thisMonth: monthCount || 0,
        thisWeek: weekCount || 0,
        attendedToday: (todayCount || 0) > 0,
      });

      setRecentAttendance(recentData || []);
    } catch (error) {
      console.error('Error fetching member data:', error);
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
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-background shadow-lg">
            <AvatarImage src={profile?.face_image_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl sm:text-2xl">
              {profile?.first_name?.[0] || 'U'}
              {profile?.last_name?.[0] || ''}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Welcome back, {profile?.first_name || 'Member'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Track your attendance and view your records.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {organization && (
                <Badge variant="secondary" className="text-xs">
                  <Building2 className="w-3 h-3 mr-1" />
                  {organization.name}
                </Badge>
              )}
              {department && (
                <Badge variant="outline" className="text-xs">
                  {department.name}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            {stats.attendedToday ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Attended Today
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <XCircle className="w-4 h-4 mr-1" />
                Not Marked Today
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Total Attendance"
          value={stats.totalAttendance}
          subtitle="All time records"
          icon={Calendar}
          iconClassName="bg-blue-500"
        />
        <StatsCard
          title="This Month"
          value={stats.thisMonth}
          subtitle={format(new Date(), 'MMMM yyyy')}
          icon={CalendarDays}
          iconClassName="bg-purple-500"
        />
        <StatsCard
          title="This Week"
          value={stats.thisWeek}
          subtitle="Current week"
          icon={TrendingUp}
          iconClassName="bg-green-500"
        />
        <StatsCard
          title="Today's Status"
          value={stats.attendedToday ? '✓' : '—'}
          subtitle={format(new Date(), 'EEEE, MMM d')}
          icon={Clock}
          iconClassName={stats.attendedToday ? "bg-green-500" : "bg-muted"}
        />
      </div>

      {/* Attendance Chart */}
      <AttendanceChart userId={profile?.id} showVisitors={false} />

      {/* Attendance Heatmap */}
      <AttendanceHeatmap userId={profile?.id} />

      {/* Streak Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceStreakTracker userId={profile?.id} />
        
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/dashboard/my-attendance">
                <History className="w-4 h-4 mr-2" />
                View Full Attendance History
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link to="/dashboard/profile">
                <User className="w-4 h-4 mr-2" />
                Edit My Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance History */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Attendance</CardTitle>
            <Link to="/dashboard/my-attendance" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No attendance records yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your attendance will appear here once marked
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAttendance.map((record) => {
                  const recordDate = new Date(record.date);
                  const isRecordToday = isToday(recordDate);
                  
                  return (
                    <div 
                      key={record.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isRecordToday ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isRecordToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {format(recordDate, 'EEEE, MMMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Marked at {record.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.confidence_score && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(record.confidence_score * 100)}% match
                          </Badge>
                        )}
                        {isRecordToday && (
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            Today
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto border-4 border-muted">
                <AvatarImage src={profile?.face_image_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {profile?.first_name?.[0] || 'U'}
                  {profile?.last_name?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold mt-3">
                {profile?.first_name} {profile?.last_name}
              </h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
            
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{profile?.phone_number || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gender</span>
                <span className="font-medium capitalize">{profile?.gender || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{department?.name || 'Not assigned'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Face Registered</span>
                <span className="font-medium">
                  {profile?.face_image_url ? (
                    <Badge className="bg-green-500/10 text-green-600 text-xs">Yes</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">No</Badge>
                  )}
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full mt-4" asChild>
              <a href="/dashboard/profile">
                <User className="w-4 h-4 mr-2" />
                Edit Profile
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MemberDashboard;
