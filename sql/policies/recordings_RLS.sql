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

