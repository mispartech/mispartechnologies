-- Step 1: Add new enum values to app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'department_head';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ushering_head_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'usher_admin';