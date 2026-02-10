import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/lib/isUuid';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Star, Zap, Award } from 'lucide-react';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface AttendanceStreakTrackerProps {
  userId: string;
}

interface StreakBadge {
  id: string;
  label: string;
  days: number;
  icon: React.ReactNode;
  color: string;
  achieved: boolean;
}

const AttendanceStreakTracker = ({ userId }: AttendanceStreakTrackerProps) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const badges: StreakBadge[] = [
    { id: 'starter', label: 'Starter', days: 3, icon: <Star className="w-4 h-4" />, color: 'bg-blue-500', achieved: currentStreak >= 3 },
    { id: 'week', label: 'Week Warrior', days: 7, icon: <Zap className="w-4 h-4" />, color: 'bg-green-500', achieved: currentStreak >= 7 },
    { id: 'fortnight', label: 'Consistent', days: 14, icon: <Flame className="w-4 h-4" />, color: 'bg-orange-500', achieved: currentStreak >= 14 },
    { id: 'month', label: 'Monthly Star', days: 30, icon: <Trophy className="w-4 h-4" />, color: 'bg-purple-500', achieved: currentStreak >= 30 },
    { id: 'champion', label: 'Champion', days: 60, icon: <Award className="w-4 h-4" />, color: 'bg-yellow-500', achieved: currentStreak >= 60 },
  ];

  useEffect(() => {
    if (userId) {
      calculateStreak();
    }
  }, [userId]);

  const calculateStreak = async () => {
    if (!isUuid(userId)) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setCurrentStreak(0);
        setLongestStreak(0);
        setLoading(false);
        return;
      }

      // Get unique dates
      const uniqueDates = [...new Set(data.map((d) => d.date))].sort().reverse();
      
      // Calculate current streak
      let streak = 0;
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      
      // Check if the most recent attendance is today or yesterday
      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const currentDate = parseISO(uniqueDates[i - 1]);
          const prevDate = parseISO(uniqueDates[i]);
          const diff = differenceInDays(currentDate, prevDate);
          
          if (diff === 1) {
            streak++;
          } else {
            break;
          }
        }
      }

      // Calculate longest streak
      let maxStreak = 1;
      let tempStreak = 1;
      
      for (let i = 1; i < uniqueDates.length; i++) {
        const currentDate = parseISO(uniqueDates[i - 1]);
        const prevDate = parseISO(uniqueDates[i]);
        const diff = differenceInDays(currentDate, prevDate);
        
        if (diff === 1) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }

      setCurrentStreak(streak);
      setLongestStreak(Math.max(maxStreak, streak));
    } catch (error) {
      console.error('Error calculating streak:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextBadge = badges.find((b) => !b.achieved);
  const daysToNext = nextBadge ? nextBadge.days - currentStreak : 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Attendance Streak
          </h3>
          {currentStreak > 0 && (
            <Badge variant="secondary" className="text-xs">
              Best: {longestStreak} days
            </Badge>
          )}
        </div>

        {/* Current Streak Display */}
        <div className="text-center py-4 mb-4 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 rounded-xl">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame className={cn(
              "w-8 h-8",
              currentStreak > 0 ? "text-orange-500 animate-pulse" : "text-muted-foreground"
            )} />
            <span className="text-4xl font-bold">{currentStreak}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentStreak === 0 
              ? "Start your streak today!" 
              : currentStreak === 1 
                ? "day streak" 
                : "days streak"}
          </p>
          {nextBadge && currentStreak > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {daysToNext} more day{daysToNext !== 1 ? 's' : ''} to unlock "{nextBadge.label}"
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Milestones</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge
                key={badge.id}
                variant={badge.achieved ? "default" : "outline"}
                className={cn(
                  "flex items-center gap-1 transition-all",
                  badge.achieved ? badge.color + " text-white" : "opacity-50"
                )}
              >
                {badge.icon}
                <span>{badge.label}</span>
                <span className="text-xs opacity-75">({badge.days}d)</span>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceStreakTracker;
