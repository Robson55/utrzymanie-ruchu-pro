-- Allow public read access for display board
-- user_roles: allow anonymous to read mechanics
CREATE POLICY "Allow public read for display board" 
ON public.user_roles 
FOR SELECT 
TO anon
USING (role = 'mechanik');

-- profiles: allow anonymous to read mechanic profiles
CREATE POLICY "Allow public read profiles for display" 
ON public.profiles 
FOR SELECT 
TO anon
USING (true);

-- issues: allow anonymous to read active issues for display
CREATE POLICY "Allow public read issues for display" 
ON public.issues 
FOR SELECT 
TO anon
USING (status IN ('zaakceptowane', 'w_realizacji'));

-- machines: allow anonymous to read machines for display
CREATE POLICY "Allow public read machines for display" 
ON public.machines 
FOR SELECT 
TO anon
USING (true);