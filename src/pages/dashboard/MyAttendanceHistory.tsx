import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { isUuid } from '@/lib/isUuid';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Calendar as CalendarIcon, 
  Download, 
  CheckCircle2,
  Filter,
  X
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import PaginationControls from '@/components/dashboard/PaginationControls';
import AttendanceChart from '@/components/dashboard/AttendanceChart';

interface DashboardContext {
  user: any;
  profile: any;
}

const MyAttendanceHistory = () => {
  const { profile } = useOutletContext<DashboardContext>();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    if (profile?.id) {
      fetchAttendance();
    }
  }, [profile?.id]);

  const fetchAttendance = async () => {
    if (!isUuid(profile.id)) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', profile.id)
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendance = useMemo(() => {
    if (!startDate && !endDate) {
      return attendance;
    }

    return attendance.filter((record) => {
      const recordDate = parseISO(record.date);
      if (startDate && endDate) {
        return isWithinInterval(recordDate, {
          start: startOfDay(startDate),
          end: endOfDay(endDate)
        });
      } else if (startDate) {
        return recordDate >= startOfDay(startDate);
      } else if (endDate) {
        return recordDate <= endOfDay(endDate);
      }
      return true;
    });
  }, [attendance, startDate, endDate]);

  // Pagination
  const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);
  const paginatedAttendance = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAttendance.slice(start, start + itemsPerPage);
  }, [filteredAttendance, currentPage, itemsPerPage]);

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Confidence Score', 'Emotion'];
    const csvData = filteredAttendance.map((record) => [
      format(parseISO(record.date), 'yyyy-MM-dd'),
      record.time,
      record.confidence_score ? `${Math.round(record.confidence_score * 100)}%` : 'N/A',
      record.recognized_emotion || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_history_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Attendance History</h1>
          <p className="text-muted-foreground">View and export your complete attendance records</p>
        </div>
        <Button onClick={exportToCSV} disabled={filteredAttendance.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Attendance Chart */}
      <AttendanceChart userId={profile?.id} showVisitors={false} />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Date Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setCurrentPage(1);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      setCurrentPage(1);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Attendance Records ({filteredAttendance.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAttendance.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No attendance records found</p>
              {(startDate || endDate) && (
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your date filters
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAttendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {format(parseISO(record.date), 'EEEE, MMMM d, yyyy')}
                        </TableCell>
                        <TableCell>{record.time}</TableCell>
                        <TableCell>
                          {record.confidence_score ? (
                            <Badge variant="secondary">
                              {Math.round(record.confidence_score * 100)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/10 text-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Present
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {paginatedAttendance.map((record) => (
                  <div key={record.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {format(parseISO(record.date), 'MMM d, yyyy')}
                      </span>
                      <Badge className="bg-green-500/10 text-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Present
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Time: {record.time}</span>
                      {record.confidence_score && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(record.confidence_score * 100)}% match
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredAttendance.length}
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

export default MyAttendanceHistory;
