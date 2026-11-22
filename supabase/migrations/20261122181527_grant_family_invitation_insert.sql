GRANT INSERT ON TABLE public.family_group_invitations TO authenticated;

DROP POLICY IF EXISTS "authenticated users can create their own invitations"
ON public.family_group_invitations;

CREATE POLICY "authenticated users can create their own invitations"
ON public.family_group_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  inviter_id = auth.uid()
  AND status = 'pending'
);
