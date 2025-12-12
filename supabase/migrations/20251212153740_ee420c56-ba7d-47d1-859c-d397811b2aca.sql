-- Create overloaded function for numeric input
CREATE OR REPLACE FUNCTION public.round_to_5_minutes(minutes numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ROUND(minutes / 5.0)::INTEGER * 5
$$;