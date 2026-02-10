import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/lib/isUuid';
import { 
  format, 
  subMonths, 
  startOfMonth, 
  endOfMonth,
  eachDayOfInterval,
  getDay,
  startOfWeek,
  addDays,
  isSameMonth
} from 'date-fns';
import { Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AttendanceHeatmapProps {
  userId?: string;
  organizationId?: string;
}

interface DayData {
  date: string;
  count: number;
  isCurrentMonth: boolean;
}

const getIntensityClass = (count: number, maxCount: number): string => {
  if (count === 0) return 'bg-muted';
  const ratio = count / Math.max(maxCount, 1);
  if (ratio <= 0.25) return 'bg-primary/25';
  if (ratio <= 0.5) return 'bg-primary/50';
  if (ratio <= 0.75) return 'bg-primary/75';
  return 'bg-primary';
};

const AttendanceHeatmap = ({ userId, organizationId }: AttendanceHeatmapProps) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceData, setAttendanceData] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(selectedYear, i, 1);
      return {
        index: i,
        name: format(date, 'MMM'),
        fullName: format(date, 'MMMM'),
      };
    });
  }, [selectedYear]);

  useEffect(() => {
    fetchYearData();
  }, [selectedYear, userId, organizationId]);

  const fetchYearData = async () => {
    setIsLoading(true);
    try {
      // Skip if userId is a non-UUID (Django integer ID)
      if (userId && !isUuid(userId)) {
        setIsLoading(false);
        return;
      }

      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      let query = supabase
        .from('attendance')
        .select('date')
        .gte('date', startDate)
        .lte('date', endDate);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Count attendance per day
      const countMap = new Map<string, number>();
      data?.forEach((record) => {
        const count = countMap.get(record.date) || 0;
        countMap.set(record.date, count + 1);
      });

      setAttendanceData(countMap);
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMonthGrid = (monthIndex: number): DayData[][] => {
    const monthStart = new Date(selectedYear, monthIndex, 1);
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart);
    
    const weeks: DayData[][] = [];
    let currentDate = gridStart;
    
    while (currentDate <= monthEnd || getDay(currentDate) !== 0) {
      const week: DayData[] = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        week.push({
          date: dateStr,
          count: attendanceData.get(dateStr) || 0,
          isCurrentMonth: isSameMonth(currentDate, monthStart),
        });
        currentDate = addDays(currentDate, 1);
      }
      weeks.push(week);
      if (currentDate > monthEnd && getDay(currentDate) === 0) break;
    }
    
    return weeks;
  };

  const maxCount = useMemo(() => {
    return Math.max(...Array.from(attendanceData.values()), 1);
  }, [attendanceData]);

  const totalAttendance = useMemo(() => {
    return Array.from(attendanceData.values()).reduce((sum, count) => sum + count, 0);
  }, [attendanceData]);

  const daysWithAttendance = useMemo(() => {
    return Array.from(attendanceData.values()).filter(count => count > 0).length;
  }, [attendanceData]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Attendance Heatmap
        </CardTitle>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {/* Stats Summary */}
        <div className="flex gap-4 mb-4 text-sm">
          <div className="px-3 py-2 bg-muted rounded-lg">
            <span className="font-semibold">{totalAttendance}</span>
            <span className="text-muted-foreground ml-1">total</span>
          </div>
          <div className="px-3 py-2 bg-muted rounded-lg">
            <span className="font-semibold">{daysWithAttendance}</span>
            <span className="text-muted-foreground ml-1">active days</span>
          </div>
        </div>

        {/* Year Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          <TooltipProvider>
            {months.map((month) => (
              <div key={month.index} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground text-center">
                  {month.name}
                </p>
                <div className="space-y-0.5">
                  {getMonthGrid(month.index).map((week, weekIdx) => (
                    <div key={weekIdx} className="flex gap-0.5 justify-center">
                      {week.map((day, dayIdx) => (
                        <Tooltip key={`${weekIdx}-${dayIdx}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-2.5 h-2.5 rounded-sm transition-colors ${
                                day.isCurrentMonth
                                  ? getIntensityClass(day.count, maxCount)
                                  : 'bg-transparent'
                              }`}
                            />
                          </TooltipTrigger>
                          {day.isCurrentMonth && (
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-medium">{format(new Date(day.date), 'MMM d, yyyy')}</p>
                              <p className="text-muted-foreground">
                                {day.count} {day.count === 1 ? 'record' : 'records'}
                              </p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </TooltipProvider>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <div className="w-3 h-3 rounded-sm bg-primary/25" />
            <div className="w-3 h-3 rounded-sm bg-primary/50" />
            <div className="w-3 h-3 rounded-sm bg-primary/75" />
            <div className="w-3 h-3 rounded-sm bg-primary" />
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceHeatmap;
