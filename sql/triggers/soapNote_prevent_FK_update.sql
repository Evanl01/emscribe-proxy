-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_soapnotes_fk_updates ON "soapNotes";

-- Create trigger function to prevent FK changes
CREATE OR REPLACE FUNCTION prevent_soapnotes_fk_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if transcript_id is being changed
    IF OLD.transcript_id IS DISTINCT FROM NEW.transcript_id THEN
        RAISE EXCEPTION 'Cannot change FK transcript_id. Current: %, Attempted: %', 
               OLD.transcript_id, NEW.transcript_id;
    END IF;
    
    -- Check if user_id is being changed (optional but often useful)
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
        RAISE EXCEPTION 'Cannot change user_id. Current: %, Attempted: %', 
               OLD.user_id, NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger on soapNotes table
CREATE TRIGGER prevent_soapnotes_fk_updates
    BEFORE UPDATE ON "soapNotes"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_soapnotes_fk_updates();



-- ===== VERIFICATION QUERIES =====

-- Check if the trigger function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'prevent_soapnotes_fk_updates'
    AND routine_schema = 'public';

-- Check if trigger exists on soapNotes
SELECT 
    trigger_name,
    event_manipulation AS event_name,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'prevent_soapnotes_fk_updates'
  AND event_object_table = 'soapNotes';

-- More detailed trigger info
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
WHERE t.tgname = 'prevent_soapnotes_fk_updates';
