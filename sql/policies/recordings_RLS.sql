create policy "Users can view their own recordings"
on "public"."recordings"
as PERMISSIVE
for SELECT
to authenticated
using (
    user_id = (SELECT auth.uid())
);

create policy "Users can modify their own recordings (except user_id)"
on "public"."recordings"
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

CREATE POLICY "Users can insert recordings (if they own FK patientEncounter_id)"
ON public."recordings"
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  "patientEncounter_id" IN (
    SELECT id FROM public."patientEncounters" WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update recordings (if they own FK patientEncounter_id)"
ON public."recordings"
AS PERMISSIVE
FOR UPDATE
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  "patientEncounter_id" IN (
    SELECT id FROM public."patientEncounters" WHERE user_id = auth.uid()
  )
);
