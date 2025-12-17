-- Create enum for spare parts status
CREATE TYPE public.spare_part_status AS ENUM ('nowe', 'zaakceptowane', 'zamowione', 'dostarczone');

-- Create spare parts table
CREATE TABLE public.spare_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  status spare_part_status NOT NULL DEFAULT 'nowe',
  requested_by UUID NOT NULL,
  accepted_by UUID,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  ordered_at TIMESTAMP WITH TIME ZONE,
  expected_delivery_date DATE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone authenticated can view spare parts
CREATE POLICY "Authenticated can view spare parts"
ON public.spare_parts
FOR SELECT
USING (true);

-- Mechanics and managers can create spare parts requests
CREATE POLICY "Mechanics and managers can create spare parts"
ON public.spare_parts
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'mechanik') OR 
  has_role(auth.uid(), 'kierownik_ur') OR 
  has_role(auth.uid(), 'admin')
);

-- Only managers/admins can update spare parts
CREATE POLICY "Managers can update spare parts"
ON public.spare_parts
FOR UPDATE
USING (is_manager(auth.uid()));

-- Only admins can delete spare parts
CREATE POLICY "Admins can delete spare parts"
ON public.spare_parts
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_spare_parts_updated_at
BEFORE UPDATE ON public.spare_parts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();