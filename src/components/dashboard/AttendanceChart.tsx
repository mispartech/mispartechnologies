import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/lib/isUuid';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  format, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  parseISO
} from 'date-fns';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { useTerminology } from '@/contexts/TerminologyContext';

interface AttendanceChartProps {
  organizationId?: string;
  userId?: string; // If provided, shows only this user's data (for member dashboard)
  showVisitors?: boolean;
}

interface DailyData {
  date: string;
  displayDate: string;
  members: number;
  visitors: number;
  total: number;
}

const CHART_COLORS = {
  members: 'hsl(var(--primary))',
  visitors: 'hsl(var(--secondary))',
  total: 'hsl(var(--accent))',
};

const PIE_COLORS = ['hsl(270, 60%, 50%)', 'hsl(300, 40%, 50%)', 'hsl(220, 60%, 50%)', 'hsl(160, 60%, 50%)'];

const AttendanceChart = ({ organizationId, userId, showVisitors = true }: AttendanceChartProps) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'month'>('7d');
  const [chartData, setChartData] = useState<DailyData[]>([]);
  const [weekdayData, setWeekdayData] = useState<{ name: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { personPlural, getTerm } = useTerminology();

  const getDateRange = () => {
    const today = new Date();
    switch (timeRange) {
      case '7d':
        return { start: subDays(today, 6), end: today };
      case '30d':
        return { start: subDays(today, 29), end: today };
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      default:
        return { start: subDays(today, 6), end: today };
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [timeRange, organizationId, userId]);

  const fetchChartData = async () => {
    setIsLoading(true);
    try {
      // Skip if userId is a non-UUID (Django integer ID)
      if (userId && !isUuid(userId)) {
        setIsLoading(false);
        return;
      }

      const { start, end } = getDateRange();
      const startDate = format(start, 'yyyy-MM-dd');
      const endDate = format(end, 'yyyy-MM-dd');

      // Build attendance query
      let attendanceQuery = supabase
        .from('attendance')
        .select('date, user_id')
        .gte('date', startDate)
        .lte('date', endDate);

      if (userId) {
        attendanceQuery = attendanceQuery.eq('user_id', userId);
      }

      const { data: memberData, error: memberError } = await attendanceQuery;
      if (memberError) throw memberError;

      // Fetch visitor data if needed
      let visitorData: any[] = [];
      if (showVisitors && !userId) {
        const { data, error } = await supabase
          .from('temp_attendance')
          .select('date')
          .gte('date', startDate)
          .lte('date', endDate);
        if (!error) visitorData = data || [];
      }

      // Generate all dates in range
      const allDates = eachDayOfInterval({ start, end });
      
      // Count attendance per day
      const memberCountMap = new Map<string, number>();
      const visitorCountMap = new Map<string, number>();

      memberData?.forEach((record) => {
        const count = memberCountMap.get(record.date) || 0;
        memberCountMap.set(record.date, count + 1);
      });

      visitorData.forEach((record) => {
        const count = visitorCountMap.get(record.date) || 0;
        visitorCountMap.set(record.date, count + 1);
      });

      // Build chart data
      const dailyData: DailyData[] = allDates.map((date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const members = memberCountMap.get(dateStr) || 0;
        const visitors = visitorCountMap.get(dateStr) || 0;
        return {
          date: dateStr,
          displayDate: format(date, timeRange === '7d' ? 'EEE' : 'MMM d'),
          members,
          visitors,
          total: members + visitors,
        };
      });

      setChartData(dailyData);

      // Calculate weekday distribution
      const weekdayCounts = new Map<string, number>();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      dayNames.forEach((day) => weekdayCounts.set(day, 0));

      memberData?.forEach((record) => {
        const dayName = format(parseISO(record.date), 'EEE');
        weekdayCounts.set(dayName, (weekdayCounts.get(dayName) || 0) + 1);
      });

      const weekdayDistribution = dayNames.map((name) => ({
        name,
        count: weekdayCounts.get(name) || 0,
      }));

      setWeekdayData(weekdayDistribution);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalStats = useMemo(() => {
    const totalMembers = chartData.reduce((sum, d) => sum + d.members, 0);
    const totalVisitors = chartData.reduce((sum, d) => sum + d.visitors, 0);
    const avgDaily = chartData.length > 0 
      ? Math.round((totalMembers + totalVisitors) / chartData.length) 
      : 0;
    return { totalMembers, totalVisitors, avgDaily };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Attendance Trends
        </CardTitle>
        <Select value={timeRange} onValueChange={(v: '7d' | '30d' | 'month') => setTimeRange(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">{totalStats.totalMembers}</p>
            <p className="text-xs text-muted-foreground capitalize">{getTerm('plural', true)}</p>
          </div>
          {showVisitors && !userId && (
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-secondary">{totalStats.totalVisitors}</p>
              <p className="text-xs text-muted-foreground">Visitors</p>
            </div>
          )}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{totalStats.avgDaily}</p>
            <p className="text-xs text-muted-foreground">Avg/Day</p>
          </div>
        </div>

        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="bar" className="text-xs">
              <BarChart3 className="w-4 h-4 mr-1" />
              Bar
            </TabsTrigger>
            <TabsTrigger value="line" className="text-xs">
              <TrendingUp className="w-4 h-4 mr-1" />
              Trend
            </TabsTrigger>
            <TabsTrigger value="pie" className="text-xs">
              <PieChartIcon className="w-4 h-4 mr-1" />
              Weekday
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bar" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="members" 
                  name={getTerm('title', true) + 's'}
                  fill={CHART_COLORS.members} 
                  radius={[4, 4, 0, 0]} 
                />
                {showVisitors && !userId && (
                  <Bar 
                    dataKey="visitors" 
                    name="Visitors" 
                    fill={CHART_COLORS.visitors} 
                    radius={[4, 4, 0, 0]} 
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="line" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  name="Total" 
                  stroke={CHART_COLORS.total}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="members" 
                  name={getTerm('title', true) + 's'}
                  stroke={CHART_COLORS.members}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="pie" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={weekdayData.filter(d => d.count > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="name"
                  label={({ name, count }) => `${name}: ${count}`}
                >
                  {weekdayData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AttendanceChart;
