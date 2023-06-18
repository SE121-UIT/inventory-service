CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
   NEW.last_updated = now();
   RETURN NEW;
END;
$$;