-- Add notification preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"push_enabled": false, "attendance_alerts": true, "email_notifications": false}'::jsonb;