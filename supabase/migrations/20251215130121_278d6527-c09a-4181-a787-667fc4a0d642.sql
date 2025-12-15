-- Create junction table for multiple mechanic assignments
CREATE TABLE public.issue_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid NOT NULL,
  UNIQUE(issue_id, user_id)
);

-- Enable RLS
ALTER TABLE public.issue_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for issue_assignments
CREATE POLICY "Authenticated can view assignments"
ON public.issue_assignments FOR SELECT
USING (true);

CREATE POLICY "Managers can create assignments"
ON public.issue_assignments FOR INSERT
WITH CHECK (is_manager(auth.uid()));

CREATE POLICY "Managers can delete assignments"
ON public.issue_assignments FOR DELETE
USING (is_manager(auth.uid()));

-- Migrate existing assigned_to data to new table
INSERT INTO public.issue_assignments (issue_id, user_id, assigned_by)
SELECT id, assigned_to, COALESCE(accepted_by, reported_by)
FROM public.issues
WHERE assigned_to IS NOT NULL;

-- Update issues RLS policy to allow any assigned mechanic to update
DROP POLICY IF EXISTS "Mechanics can update assigned issues" ON public.issues;

CREATE POLICY "Assigned mechanics can update issues"
ON public.issues FOR UPDATE
USING (
  has_role(auth.uid(), 'mechanik'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.issue_assignments 
    WHERE issue_id = issues.id AND user_id = auth.uid()
  )
);