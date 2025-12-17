-- Add foreign key constraints for spare_parts
ALTER TABLE public.spare_parts
ADD CONSTRAINT spare_parts_requested_by_fkey
FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.spare_parts
ADD CONSTRAINT spare_parts_accepted_by_fkey
FOREIGN KEY (accepted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;