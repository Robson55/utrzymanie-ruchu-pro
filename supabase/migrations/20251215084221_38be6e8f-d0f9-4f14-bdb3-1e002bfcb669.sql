-- Create planned_works table
CREATE TABLE public.planned_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_date date NOT NULL,
  week_number integer,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  is_weekly boolean DEFAULT false,
  status text DEFAULT 'zaplanowane' CHECK (status IN ('zaplanowane', 'wykonane', 'anulowane')),
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.planned_works ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated can view planned works"
ON public.planned_works
FOR SELECT
USING (true);

CREATE POLICY "Managers can create planned works"
ON public.planned_works
FOR INSERT
WITH CHECK (is_manager(auth.uid()));

CREATE POLICY "Managers can update planned works"
ON public.planned_works
FOR UPDATE
USING (is_manager(auth.uid()));

CREATE POLICY "Managers can delete planned works"
ON public.planned_works
FOR DELETE
USING (is_manager(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_planned_works_updated_at
BEFORE UPDATE ON public.planned_works
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();