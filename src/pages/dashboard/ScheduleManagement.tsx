import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { useActivityLogger } from '@/hooks/useActivityLogger';

interface ServiceSchedule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  attendance_buffer_minutes: number;
  created_at: string;
  updated_at: string;
}

const daysOfWeek = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const ScheduleManagement = () => {
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedSchedules, setEditedSchedules] = useState<Map<string, Partial<ServiceSchedule>>>(new Map());
  const { toast } = useToast();
  const { logActivity } = useActivityLogger();

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('service_schedules')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setSchedules((data as ServiceSchedule[]) || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schedules',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.organization_id) {
        toast({
          title: 'Error',
          description: 'No organization found',
          variant: 'destructive',
        });
        return;
      }

      const newSchedule = {
        organization_id: profile.organization_id,
        name: 'New Schedule',
        description: '',
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        is_active: true,
        attendance_buffer_minutes: 30,
      };

      const { data, error } = await supabase
        .from('service_schedules')
        .insert(newSchedule as never)
        .select()
        .single();

      if (error) throw error;

      setSchedules(prev => [...prev, data as ServiceSchedule]);
      await logActivity({
        action: 'create',
        entityType: 'settings',
        entityId: (data as ServiceSchedule).id,
        metadata: { name: 'New Schedule' }
      });

      toast({
        title: 'Schedule Added',
        description: 'New schedule created. Remember to save your changes.',
      });
    } catch (error) {
      console.error('Error adding schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to add schedule',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('service_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSchedules(prev => prev.filter(s => s.id !== id));
      editedSchedules.delete(id);
      setEditedSchedules(new Map(editedSchedules));

      await logActivity({
        action: 'delete',
        entityType: 'settings',
        entityId: id
      });

      toast({
        title: 'Schedule Deleted',
        description: 'The schedule has been removed.',
      });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive',
      });
    }
  };

  const handleScheduleChange = (id: string, field: keyof ServiceSchedule, value: any) => {
    const current = editedSchedules.get(id) || {};
    editedSchedules.set(id, { ...current, [field]: value });
    setEditedSchedules(new Map(editedSchedules));

    // Update local state for immediate UI feedback
    setSchedules(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleSaveAll = async () => {
    if (editedSchedules.size === 0) {
      toast({
        title: 'No Changes',
        description: 'No changes to save.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updates = Array.from(editedSchedules.entries()).map(([id, changes]) => ({
        id,
        ...changes,
      }));

      for (const update of updates) {
        const { id, ...fields } = update;
        const { error } = await supabase
          .from('service_schedules')
          .update(fields as never)
          .eq('id', id);

        if (error) throw error;
      }

      setEditedSchedules(new Map());
      await logActivity({
        action: 'update',
        entityType: 'settings',
        metadata: { count: updates.length }
      });

      toast({
        title: 'Saved',
        description: `${updates.length} schedule(s) updated successfully.`,
      });
    } catch (error) {
      console.error('Error saving schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to save some changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule Management</h1>
          <p className="text-muted-foreground">Configure attendance tracking schedules</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddSchedule} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Schedule
          </Button>
          <Button 
            onClick={handleSaveAll} 
            disabled={editedSchedules.size === 0 || isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Schedules Grid */}
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Schedules Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create schedules to define when attendance should be tracked.
            </p>
            <Button onClick={handleAddSchedule} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Schedule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className={!schedule.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {daysOfWeek.find(d => d.value === schedule.day_of_week)?.label}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={(checked) => handleScheduleChange(schedule.id, 'is_active', checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {schedule.start_time} - {schedule.end_time}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={schedule.name}
                    onChange={(e) => handleScheduleChange(schedule.id, 'name', e.target.value)}
                    className="h-8 text-sm mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Day</Label>
                  <Select
                    value={String(schedule.day_of_week)}
                    onValueChange={(val) => handleScheduleChange(schedule.id, 'day_of_week', parseInt(val))}
                  >
                    <SelectTrigger className="h-8 text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map(day => (
                        <SelectItem key={day.value} value={String(day.value)}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Start</Label>
                    <Input
                      type="time"
                      value={schedule.start_time}
                      onChange={(e) => handleScheduleChange(schedule.id, 'start_time', e.target.value)}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">End</Label>
                    <Input
                      type="time"
                      value={schedule.end_time}
                      onChange={(e) => handleScheduleChange(schedule.id, 'end_time', e.target.value)}
                      className="h-8 text-sm mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Buffer (minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="120"
                    value={schedule.attendance_buffer_minutes}
                    onChange={(e) => handleScheduleChange(schedule.id, 'attendance_buffer_minutes', parseInt(e.target.value) || 0)}
                    className="h-8 text-sm mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Allow attendance this many minutes before/after schedule
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleManagement;