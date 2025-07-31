-- Create trigger function to prevent FK changes
DROP TRIGGER IF EXISTS prevent_transcript_fk_updates ON transcripts;

CREATE OR REPLACE FUNCTION prevent_transcript_fk_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if recording_id is being changed
    IF OLD.recording_id IS DISTINCT FROM NEW.recording_id THEN
        RAISE EXCEPTION 'Cannot change FK recording_id. Current: %, Attempted: %', 
               OLD.recording_id, NEW.recording_id;
    END IF;
    
    -- Check if user_id is being changed
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
        RAISE EXCEPTION 'Cannot change user_id. Current: %, Attempted: %', 
               OLD.user_id, NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger on transcripts table
CREATE TRIGGER prevent_transcript_fk_updates
    BEFORE UPDATE ON transcripts
    FOR EACH ROW
    EXECUTE FUNCTION prevent_transcript_fk_updates();


-- ===== VERIFICATION QUERIES =====

-- Check if function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'prevent_transcript_fk_updates'
    AND routine_schema = 'public';

-- Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation AS event_name,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'prevent_transcript_fk_updates'
    AND event_object_table = 'transcripts';

-- Alternative trigger check (more detailed)
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    CASE t.tgtype & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as timing,
    CASE t.tgtype & 28
        WHEN 4 THEN 'INSERT'
        WHEN 8 THEN 'DELETE'
        WHEN 16 THEN 'UPDATE'
        WHEN 28 THEN 'INSERT OR UPDATE OR DELETE'
    END as events
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'prevent_transcript_fk_updates';