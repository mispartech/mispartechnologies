import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CalendarIcon, 
  Download, 
  RefreshCw, 
  Search,
  Users,
  UserCheck,
  Clock,
  Filter,
  Building2
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PaginationControls from '@/components/dashboard/PaginationControls';
import AttendanceChart from '@/components/dashboard/AttendanceChart';
import { useTerminology } from '@/contexts/TerminologyContext';

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  time: string;
  confidence_score: number | null;
  face_detections: number | null;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    department_id: string | null;
    department?: string | null;
  };
}

interface TempAttendanceRecord {
  id: string;
  temp_face_id: string;
  date: string;
  time: string;
  face_detections: number | null;
  status: string | null;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
}

const AttendanceHistory = () => {
  const { profile } = useOutletContext<{ profile: any }>();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [tempRecords, setTempRecords] = useState<TempAttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 7));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<'members' | 'visitors' | 'all'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [stats, setStats] = useState({ total: 0, members: 0, visitors: 0, avgConfidence: 0 });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const { toast } = useToast();
  const { getTerm, personPlural } = useTerminology();

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      
      if (!error && data) {
        setDepartments(data);
      }
    };
    fetchDepartments();
  }, []);

  const fetchAttendanceData = async () => {
    setIsLoading(true);
    try {
      const fromDate = format(startOfDay(dateFrom), 'yyyy-MM-dd');
      const toDate = format(endOfDay(dateTo), 'yyyy-MM-dd');

      // Fetch member attendance
      const { data: memberData, error: memberError } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles!attendance_user_id_fkey (
            first_name,
            last_name,
            email,
            department_id,
            department
          )
        `)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (memberError) {
        console.error('Error fetching attendance:', memberError);
        throw memberError;
      }

      // Fetch visitor/temp attendance
      const { data: tempData, error: tempError } = await supabase
        .from('temp_attendance')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (tempError) {
        console.error('Error fetching temp attendance:', tempError);
        throw tempError;
      }

      setAttendanceRecords(memberData || []);
      setTempRecords(tempData || []);

      // Calculate stats
      const memberCount = memberData?.length || 0;
      const visitorCount = tempData?.length || 0;
      const totalConfidence = memberData?.reduce((sum, r) => sum + (r.confidence_score || 0), 0) || 0;
      const avgConfidence = memberCount > 0 ? totalConfidence / memberCount : 0;

      setStats({
        total: memberCount + visitorCount,
        members: memberCount,
        visitors: visitorCount,
        avgConfidence: Math.round(avgConfidence * 100),
      });

      // Reset to first page when data changes
      setCurrentPage(1);

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch attendance records',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [dateFrom, dateTo]);

  const filteredMembers = useMemo(() => 
    attendanceRecords.filter(record => {
      // Search filter
      const matchesSearch = !searchQuery || (() => {
        const fullName = `${record.profiles?.first_name || ''} ${record.profiles?.last_name || ''}`.toLowerCase();
        const email = record.profiles?.email?.toLowerCase() || '';
        return fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
      })();

      // Department filter
      const matchesDepartment = selectedDepartment === 'all' || 
        record.profiles?.department_id === selectedDepartment;

      return matchesSearch && matchesDepartment;
    }), [attendanceRecords, searchQuery, selectedDepartment]);

  const filteredVisitors = useMemo(() => 
    tempRecords.filter(record => {
      if (!searchQuery) return true;
      return record.temp_face_id.toLowerCase().includes(searchQuery.toLowerCase());
    }), [tempRecords, searchQuery]);

  // Combined and paginated data
  const combinedData = useMemo(() => {
    let data: Array<{ type: 'member' | 'visitor'; record: AttendanceRecord | TempAttendanceRecord }> = [];
    
    if (viewType !== 'visitors') {
      filteredMembers.forEach(record => data.push({ type: 'member', record }));
    }
    if (viewType !== 'members') {
      filteredVisitors.forEach(record => data.push({ type: 'visitor', record }));
    }
    
    // Sort by date and time
    data.sort((a, b) => {
      const dateA = new Date(`${a.record.date}T${a.record.time}`);
      const dateB = new Date(`${b.record.date}T${b.record.time}`);
      return dateB.getTime() - dateA.getTime();
    });
    
    return data;
  }, [filteredMembers, filteredVisitors, viewType]);

  const totalPages = Math.ceil(combinedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return combinedData.slice(start, start + itemsPerPage);
  }, [combinedData, currentPage, itemsPerPage]);

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Type', 'Name/ID', 'Confidence', 'Detections'];
    const rows: string[][] = [];

    filteredMembers.forEach(record => {
      rows.push([
        record.date,
        record.time,
        getTerm('title', true),
        `${record.profiles?.first_name || ''} ${record.profiles?.last_name || ''}`.trim() || 'Unknown',
        record.confidence_score ? `${Math.round(record.confidence_score * 100)}%` : 'N/A',
        String(record.face_detections || 1),
      ]);
    });

    filteredVisitors.forEach(record => {
      rows.push([
        record.date,
        record.time,
        'Visitor',
        record.temp_face_id,
        'N/A',
        String(record.face_detections || 1),
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${format(dateFrom, 'yyyy-MM-dd')}_to_${format(dateTo, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Attendance data exported to CSV',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance History</h1>
          <p className="text-muted-foreground">View and analyze attendance records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAttendanceData} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Records</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground capitalize">{personPlural}</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">{stats.members}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-foreground" />
              <span className="text-sm text-muted-foreground">Visitors</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-accent-foreground">{stats.visitors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Confidence</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avgConfidence}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Chart */}
      <AttendanceChart organizationId={profile?.organization_id} showVisitors={true} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateFrom, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(date) => date && setDateFrom(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateTo, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(date) => date && setDateTo(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Department Filter */}
            <Select value={selectedDepartment} onValueChange={(v) => {
              setSelectedDepartment(v);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Type */}
            <Select value={viewType} onValueChange={(v: 'members' | 'visitors' | 'all') => {
              setViewType(v);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="View type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Records</SelectItem>
                <SelectItem value="members">{getTerm('plural', true)} Only</SelectItem>
                <SelectItem value="visitors">Visitors Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table with Pagination */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Name / ID</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Detections</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map(({ type, record }) => (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{record.time.slice(0, 5)}</TableCell>
                        <TableCell>
                          <Badge variant={type === 'member' ? 'default' : 'secondary'}>
                            {type === 'member' ? getTerm('title', true) : 'Visitor'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {type === 'member' 
                            ? `${(record as AttendanceRecord).profiles?.first_name || ''} ${(record as AttendanceRecord).profiles?.last_name || ''}`.trim() || 'Unknown'
                            : (record as TempAttendanceRecord).temp_face_id
                          }
                        </TableCell>
                        <TableCell>
                          {type === 'member' && (record as AttendanceRecord).confidence_score ? (
                            <Badge variant={(record as AttendanceRecord).confidence_score! > 0.8 ? 'default' : 'secondary'}>
                              {Math.round((record as AttendanceRecord).confidence_score! * 100)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>{record.face_detections || 1}</TableCell>
                        <TableCell>
                          {type === 'member' ? (
                            <Badge variant="outline" className="text-primary border-primary">
                              Verified
                            </Badge>
                          ) : (
                            <Badge 
                              variant={(record as TempAttendanceRecord).status === 'claimed' ? 'default' : 'secondary'}
                            >
                              {(record as TempAttendanceRecord).status === 'claimed' ? 'Claimed' : 'Pending'}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No attendance records found for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={combinedData.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceHistory;
