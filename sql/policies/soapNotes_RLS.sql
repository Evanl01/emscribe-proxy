ALTER TABLE public."soapNotes" ENABLE ROW LEVEL SECURITY;

create policy "Users can view their own soapNotes"
on "public"."soapNotes"
as PERMISSIVE
for SELECT
to authenticated
using (
    user_id = (SELECT auth.uid())
);

create policy "Users can modify their own soapNotes (except user_id)"
on "public"."soapNotes"
as PERMISSIVE
for ALL
to authenticated
using (
    user_id = (SELECT auth.uid())
)
with check (  
    user_id = (SELECT auth.uid()) AND
    user_id IS NOT NULL
);

-- Enable RLS on the table


-- INSERT policy
DROP POLICY IF EXISTS "Users can insert soapNotes (if they own FK transcript_id)" ON public."soapNotes";
CREATE POLICY "Users can insert soapNotes (if they own FK transcript_id)"
ON public."soapNotes"
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid()) AND
  transcript_id IN (
    SELECT id FROM transcripts WHERE user_id = (SELECT auth.uid())
  )
);

-- UPDATE policy
DROP POLICY IF EXISTS "Users can update soapNotes (if they own FK transcript_id)" ON public."soapNotes";
CREATE POLICY "Users can update soapNotes (if they own FK transcript_id)"
ON public."soapNotes"
AS PERMISSIVE
FOR UPDATE
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid()) AND
  transcript_id IN (
    SELECT id FROM transcripts WHERE user_id = (SELECT auth.uid())
  )
);
