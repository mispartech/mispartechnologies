import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, UserPlus, Eye, UserCheck, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StatsCard from '@/components/dashboard/StatsCard';
import ClaimVisitorModal from '@/components/dashboard/ClaimVisitorModal';
import { format } from 'date-fns';
import { useTerminology } from '@/contexts/TerminologyContext';

interface TempMember {
  id: string;
  temp_face_id: string;
  date: string;
  time: string;
  face_detections: number;
  face_roi_url: string;
  created_at: string;
}

const TempMembersList = () => {
  const [tempMembers, setTempMembers] = useState<TempMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState<TempMember | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, today: 0, thisWeek: 0 });
  const { toast } = useToast();
  const { getTerm, personPlural } = useTerminology();

  useEffect(() => {
    fetchTempMembers();
  }, []);

  const fetchTempMembers = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('temp_attendance')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tempData = data || [];
      setTempMembers(tempData);

      // Calculate stats
      setStats({
        total: tempData.length,
        today: tempData.filter(m => m.date === today).length,
        thisWeek: tempData.filter(m => m.date >= weekAgo).length
      });
    } catch (error) {
      console.error('Error fetching temp members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch temporary members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = tempMembers.filter(member => {
    if (!searchQuery) return true;
    return member.temp_face_id.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
          <h1 className="text-2xl font-bold text-foreground">Temporary {getTerm('plural', true)}</h1>
          <p className="text-muted-foreground">Unregistered visitors detected by the system</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Visitors"
          value={stats.total}
          subtitle="All time"
          icon={UserPlus}
          iconClassName="bg-blue-500"
        />
        <StatsCard
          title="Today"
          value={stats.today}
          subtitle={format(new Date(), 'MMM d, yyyy')}
          icon={Clock}
          iconClassName="bg-green-500"
        />
        <StatsCard
          title="This Week"
          value={stats.thisWeek}
          subtitle="Last 7 days"
          icon={UserCheck}
          iconClassName="bg-purple-500"
        />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by face ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Face</TableHead>
                <TableHead>Temp ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Appearances</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No temporary {personPlural} found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={member.face_roi_url} />
                        <AvatarFallback className="bg-yellow-100 text-yellow-600">
                          ?
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {member.temp_face_id.substring(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>{member.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {member.time}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {member.face_detections || 1}x
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedVisitor(member);
                            setClaimModalOpen(true);
                          }}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Register as {getTerm('title', true)}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ClaimVisitorModal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        visitor={selectedVisitor}
        onSuccess={fetchTempMembers}
      />
    </div>
  );
};

export default TempMembersList;
