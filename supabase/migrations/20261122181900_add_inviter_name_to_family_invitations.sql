ALTER TABLE public.family_group_invitations
ADD COLUMN IF NOT EXISTS inviter_name text;
