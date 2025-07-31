-- Add updated_at column if it doesn't exist
ALTER TABLE your_table
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create or replace the function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to call the function on UPDATE
DROP TRIGGER IF EXISTS update_updated_at ON your_table;

CREATE TRIGGER update_updated_at
BEFORE UPDATE ON your_table
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();