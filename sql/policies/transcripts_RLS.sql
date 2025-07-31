ALTER TABLE public."transcripts" ENABLE ROW LEVEL SECURITY;

create policy "Users can view their own transcripts"
on "public"."transcripts"
as PERMISSIVE
for SELECT
to authenticated
using (
    user_id = (SELECT auth.uid())
);

create policy "Users can modify their own transcripts (except user_id)"
on "public"."transcripts"
as PERMISSIVE
for ALL
to authenticated
using (
    user_id = (SELECT auth.uid())
)
with check (  
    user_id = (SELECT auth.uid()) AND
    user_id IS NOT NULL
    -- Add other FKs here as needed
);


CREATE POLICY "Users can insert transcripts (if they own FK recording_id)"
ON public."transcripts"
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid()) AND
  recording_id IN (
    SELECT id FROM recordings WHERE user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can update transcripts (if they own FK recording_id)"
ON public."transcripts"
AS PERMISSIVE
FOR UPDATE
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid()) AND
  recording_id IN (
    SELECT id FROM recordings WHERE user_id = (SELECT auth.uid())
  )
);
