import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type EntityType = 'member' | 'department' | 'attendance' | 'visitor' | 'admin' | 'organization' | 'settings' | 'schedule';
type ActionType = 'create' | 'update' | 'delete' | 'view' | 'claim' | 'invite' | 'login' | 'logout';

interface LogActivityParams {
  action: ActionType;
  entityType: EntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export const useActivityLogger = () => {
  const logActivity = useCallback(async ({
    action,
    entityType,
    entityId,
    metadata = {}
  }: LogActivityParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: user.id,
          organization_id: profile?.organization_id,
          action,
          entity_type: entityType,
          entity_id: entityId,
          metadata: metadata as any
        }]);

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (err) {
      console.error('Activity logging error:', err);
    }
  }, []);

  return { logActivity };
};
