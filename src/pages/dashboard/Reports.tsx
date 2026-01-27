import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Clock,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceStats {
  totalRecords: number;
  uniqueMembers: number;
  averagePerDay: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444'];

const Reports = () => {
  const { profile } = useOutletContext<{ profile: any }>();
  const [period, setPeriod] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [timeDistribution, setTimeDistribution] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [period]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // Fetch attendance records
      const { data: attendance, error } = await supabase
        .from('attendance')
        .select('*, profiles(first_name, last_name, department)')
        .gte('date', startDate);

      if (error) throw error;

      // Calculate stats
      const uniqueMembers = new Set(attendance?.map(a => a.user_id)).size;
      const totalRecords = attendance?.length || 0;
      const averagePerDay = totalRecords / days;

      // Calculate trend (compare with previous period)
      const previousStart = format(subDays(new Date(), days * 2), 'yyyy-MM-dd');
      const { data: previousAttendance } = await supabase
        .from('attendance')
        .select('id')
        .gte('date', previousStart)
        .lt('date', startDate);

      const previousTotal = previousAttendance?.length || 0;
      const trendPercentage = previousTotal > 0 
        ? ((totalRecords - previousTotal) / previousTotal) * 100 
        : 0;

      setStats({
        totalRecords,
        uniqueMembers,
        averagePerDay: Math.round(averagePerDay * 10) / 10,
        trend: trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'stable',
        trendPercentage: Math.abs(Math.round(trendPercentage)),
      });

      // Generate daily data
      const dateRange = eachDayOfInterval({
        start: subDays(new Date(), days),
        end: new Date(),
      });

      const dailyStats = dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = attendance?.filter(a => a.date === dateStr).length || 0;
        return {
          date: format(date, 'MMM dd'),
          count,
        };
      });
      setDailyData(dailyStats);

      // Department breakdown
      const deptCounts: Record<string, number> = {};
      attendance?.forEach(a => {
        const dept = (a.profiles as any)?.department || 'Unknown';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      setDepartmentData(Object.entries(deptCounts).map(([name, value]) => ({ name, value })));

      // Time distribution
      const timeCounts: Record<string, number> = {};
      attendance?.forEach(a => {
        const hour = parseInt(a.time?.split(':')[0] || '0');
        let timeSlot = '';
        if (hour < 9) timeSlot = 'Early (< 9am)';
        else if (hour < 12) timeSlot = 'Morning (9am-12pm)';
        else if (hour < 14) timeSlot = 'Noon (12pm-2pm)';
        else if (hour < 17) timeSlot = 'Afternoon (2pm-5pm)';
        else timeSlot = 'Evening (> 5pm)';
        timeCounts[timeSlot] = (timeCounts[timeSlot] || 0) + 1;
      });
      setTimeDistribution(Object.entries(timeCounts).map(([name, value]) => ({ name, value })));

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('attendance')
        .select('*, profiles(first_name, last_name, email, department)')
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (error) throw error;

      const csvContent = [
        ['Date', 'Time', 'Name', 'Email', 'Department', 'Confidence Score'].join(','),
        ...(data || []).map(row => [
          row.date,
          row.time,
          `${(row.profiles as any)?.first_name || ''} ${(row.profiles as any)?.last_name || ''}`,
          (row.profiles as any)?.email || '',
          (row.profiles as any)?.department || '',
          row.confidence_score || '',
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Report Exported',
        description: 'The attendance report has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export the report.',
        variant: 'destructive',
      });
    }
  };

  const exportToPDF = async () => {
    try {
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('attendance')
        .select('*, profiles(first_name, last_name, email, department)')
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (error) throw error;

      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text('Attendance Report', 14, 22);
      
      // Report period
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Period: ${startDate} to ${endDate}`, 14, 32);
      doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 14, 40);
      
      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text('Summary', 14, 55);
      
      doc.setFontSize(11);
      doc.setTextColor(60);
      doc.text(`Total Records: ${stats?.totalRecords || 0}`, 14, 65);
      doc.text(`Unique Members: ${stats?.uniqueMembers || 0}`, 14, 73);
      doc.text(`Daily Average: ${stats?.averagePerDay || 0}`, 14, 81);
      doc.text(`Trend: ${stats?.trend === 'up' ? '↑' : stats?.trend === 'down' ? '↓' : '→'} ${stats?.trendPercentage || 0}% from previous period`, 14, 89);
      
      // Department breakdown
      if (departmentData.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text('Department Breakdown', 14, 105);
        
        let yPos = 115;
        doc.setFontSize(10);
        doc.setTextColor(60);
        departmentData.forEach((dept) => {
          doc.text(`${dept.name}: ${dept.value} records`, 18, yPos);
          yPos += 8;
        });
      }
      
      // Time distribution
      if (timeDistribution.length > 0) {
        const yStart = departmentData.length > 0 ? 115 + (departmentData.length * 8) + 15 : 105;
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text('Check-in Time Distribution', 14, yStart);
        
        let yPos = yStart + 10;
        doc.setFontSize(10);
        doc.setTextColor(60);
        timeDistribution.forEach((time) => {
          doc.text(`${time.name}: ${time.value} records`, 18, yPos);
          yPos += 8;
        });
      }
      
      // Add new page for detailed table
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text('Detailed Attendance Records', 14, 20);
      
      // Table data
      const tableData = (data || []).slice(0, 100).map(row => [
        row.date,
        row.time?.slice(0, 5) || '',
        `${(row.profiles as any)?.first_name || ''} ${(row.profiles as any)?.last_name || ''}`.trim() || 'Unknown',
        (row.profiles as any)?.department || '-',
        row.confidence_score ? `${Math.round(row.confidence_score * 100)}%` : '-',
      ]);
      
      autoTable(doc, {
        startY: 28,
        head: [['Date', 'Time', 'Name', 'Department', 'Confidence']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [100, 100, 100] },
        styles: { fontSize: 9 },
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      }
      
      doc.save(`attendance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast({
        title: 'PDF Exported',
        description: 'The attendance report PDF has been downloaded.',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export the PDF report.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Attendance insights and statistics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="quarter">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            CSV
          </Button>
          <Button onClick={exportToPDF} variant="default" className="gap-2">
            <FileText className="w-4 h-4" />
            PDF Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{stats?.totalRecords || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
            {stats?.trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                stats.trend === 'up' ? 'text-green-600' : stats.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {stats.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {stats.trendPercentage}% from previous period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unique Members</p>
                <p className="text-2xl font-bold">{stats?.uniqueMembers || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/10">
                <Users className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Daily Average</p>
                <p className="text-2xl font-bold">{stats?.averagePerDay || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Report Period</p>
                <p className="text-2xl font-bold capitalize">{period}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-100">
                <FileSpreadsheet className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Attendance Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Attendance Trend</CardTitle>
            <CardDescription>Number of attendance records per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>By Department</CardTitle>
            <CardDescription>Attendance distribution by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {departmentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {departmentData.map((dept, index) => (
                <Badge 
                  key={dept.name} 
                  variant="outline"
                  style={{ borderColor: COLORS[index % COLORS.length] }}
                >
                  {dept.name}: {dept.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Check-in Times</CardTitle>
            <CardDescription>When members check in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
