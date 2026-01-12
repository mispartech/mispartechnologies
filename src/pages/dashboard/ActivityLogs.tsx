import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Search, Filter, Loader2, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  view: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  claim: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  invite: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  login: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  logout: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

const ENTITY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'member', label: 'Member' },
  { value: 'department', label: 'Department' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'visitor', label: 'Visitor' },
  { value: 'admin', label: 'Admin' },
  { value: 'organization', label: 'Organization' },
  { value: 'settings', label: 'Settings' },
];

const ActivityLogs = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch profiles separately to avoid relation issues
      const userIds = [...new Set((data || []).map(log => log.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      const logsWithProfiles = (data || []).map(log => ({
        ...log,
        metadata: (log.metadata || {}) as Record<string, unknown>,
        profiles: log.user_id ? profileMap.get(log.user_id) : undefined
      }));

      setLogs(logsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity logs.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesType = filterType === 'all' || log.entity_type === filterType;
    const userName = log.profiles 
      ? `${log.profiles.first_name || ''} ${log.profiles.last_name || ''} ${log.profiles.email || ''}`
      : '';
    const matchesSearch = 
      userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  const formatMetadata = (metadata: Record<string, unknown>) => {
    if (!metadata || Object.keys(metadata).length === 0) return '-';
    return Object.entries(metadata)
      .slice(0, 2)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground">Track all user actions in your organization</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Showing the latest {filteredLogs.length} activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, action, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {log.profiles?.first_name && log.profiles?.last_name
                                ? `${log.profiles.first_name} ${log.profiles.last_name}`
                                : log.profiles?.email || 'Unknown User'}
                            </p>
                            {log.profiles?.email && log.profiles?.first_name && (
                              <p className="text-xs text-muted-foreground">
                                {log.profiles.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100'}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{log.entity_type}</span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                        {formatMetadata(log.metadata)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogs;
