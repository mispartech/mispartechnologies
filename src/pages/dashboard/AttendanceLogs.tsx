import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Calendar,
  Download,
  Filter,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  time: string;
  confidence_score: number;
  recognized_emotion: string;
  profiles?: {
    first_name: string;
    last_name: string;
    face_image_url: string;
    departments?: { name: string };
  };
}

const AttendanceLogs = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [dateFilter, departmentFilter]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name');
    setDepartments(data || []);
  };

  const fetchAttendance = async () => {
    try {
      // Use explicit relationship path to avoid ambiguity
      let query = supabase
        .from('attendance')
        .select(`
          *,
          profiles!attendance_user_id_fkey(
            first_name, 
            last_name, 
            face_image_url, 
            department_id,
            departments!profiles_department_id_fkey(name)
          )
        `)
        .eq('date', dateFilter)
        .order('time', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Filter by department if selected
      let filtered = data || [];
      if (departmentFilter !== 'all') {
        filtered = filtered.filter(
          a => a.profiles?.department_id === departmentFilter
        );
      }

      setAttendance(filtered);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendance = attendance.filter(record => {
    if (!searchQuery) return true;
    const name = `${record.profiles?.first_name} ${record.profiles?.last_name}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const exportToCSV = () => {
    const headers = ['Name', 'Date', 'Time', 'Department', 'Confidence'];
    const rows = filteredAttendance.map(record => [
      `${record.profiles?.first_name} ${record.profiles?.last_name}`,
      record.date,
      record.time,
      record.profiles?.departments?.name || 'N/A',
      record.confidence_score ? `${Math.round(record.confidence_score * 100)}%` : 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${dateFilter}.csv`;
    a.click();
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Logs</h1>
          <p className="text-muted-foreground">View and export attendance records</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Present</p>
              <p className="text-2xl font-bold">{attendance.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="text-lg font-semibold">{format(new Date(dateFilter), 'EEEE, MMM d')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100">
              <Filter className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Departments</p>
              <p className="text-lg font-semibold">{departments.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-auto"
            />
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table/Cards */}
      <Card>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Emotion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={record.profiles?.face_image_url} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {record.profiles?.first_name?.[0]}
                              {record.profiles?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {record.profiles?.first_name} {record.profiles?.last_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {record.time}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.profiles?.departments?.name || (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.confidence_score ? (
                          <Badge 
                            variant={record.confidence_score > 0.8 ? 'default' : 'secondary'}
                          >
                            {Math.round(record.confidence_score * 100)}%
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="capitalize">
                        {record.recognized_emotion || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {filteredAttendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records found
              </div>
            ) : (
              filteredAttendance.map((record) => (
                <div key={record.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={record.profiles?.face_image_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {record.profiles?.first_name?.[0]}
                          {record.profiles?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {record.profiles?.first_name} {record.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {record.profiles?.departments?.name || 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {record.time}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {record.confidence_score && (
                      <Badge 
                        variant={record.confidence_score > 0.8 ? 'default' : 'secondary'}
                      >
                        {Math.round(record.confidence_score * 100)}% match
                      </Badge>
                    )}
                    {record.recognized_emotion && (
                      <Badge variant="secondary" className="capitalize">
                        {record.recognized_emotion}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceLogs;
