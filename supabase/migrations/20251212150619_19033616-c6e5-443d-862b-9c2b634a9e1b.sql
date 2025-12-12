-- Fix search_path for functions without it
CREATE OR REPLACE FUNCTION public.round_to_5_minutes(minutes INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ROUND(minutes / 5.0)::INTEGER * 5
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;