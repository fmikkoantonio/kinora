UPDATE public.family_group_invitations AS invitation
SET inviter_name = COALESCE(
  NULLIF(BTRIM(auth_user.raw_user_meta_data ->> 'full_name'), ''),
  NULLIF(SPLIT_PART(auth_user.email, '@', 1), ''),
  'Family member'
)
FROM auth.users AS auth_user
WHERE invitation.inviter_id = auth_user.id
  AND NULLIF(BTRIM(invitation.inviter_name), '') IS NULL;
