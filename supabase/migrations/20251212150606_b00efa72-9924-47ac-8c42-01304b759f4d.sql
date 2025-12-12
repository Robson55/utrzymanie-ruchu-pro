-- Create role enum
CREATE TYPE public.app_role AS ENUM ('kierownik_zmiany', 'kontrola_jakosci', 'kierownik_ur', 'mechanik', 'admin');

-- Create issue status enum
CREATE TYPE public.issue_status AS ENUM ('nowe', 'zaakceptowane', 'w_realizacji', 'zakonczone');

-- Create issue sub-status enum (for w_realizacji)
CREATE TYPE public.issue_substatus AS ENUM ('aktywne', 'wstrzymane', 'przerwa', 'brak_czesci');

-- Create priority enum
CREATE TYPE public.issue_priority AS ENUM ('niski', 'sredni', 'wysoki', 'krytyczny');

-- User roles table (security best practice)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Machines table
CREATE TABLE public.machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    machine_number TEXT NOT NULL UNIQUE,
    location TEXT,
    machine_type TEXT,
    manufacturer TEXT,
    installation_date DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Issues/tickets table
CREATE TABLE public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority issue_priority NOT NULL DEFAULT 'sredni',
    status issue_status NOT NULL DEFAULT 'nowe',
    substatus issue_substatus DEFAULT 'aktywne',
    reported_by UUID REFERENCES auth.users(id) NOT NULL,
    accepted_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    
    -- Time tracking
    reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Calculated times (in minutes, rounded to 5)
    reaction_time_minutes INTEGER,
    assignment_time_minutes INTEGER,
    work_time_minutes INTEGER,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Issue status history (for tracking pauses, breaks, etc.)
CREATE TABLE public.issue_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
    status issue_status NOT NULL,
    substatus issue_substatus,
    changed_by UUID REFERENCES auth.users(id) NOT NULL,
    comment TEXT,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Issue attachments
CREATE TABLE public.issue_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_attachments ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- Function to check if user has any management role
CREATE OR REPLACE FUNCTION public.is_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('kierownik_ur', 'admin')
  )
$$;

-- Function to round minutes to 5
CREATE OR REPLACE FUNCTION public.round_to_5_minutes(minutes INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROUND(minutes / 5.0)::INTEGER * 5
$$;

-- Trigger to calculate time differences
CREATE OR REPLACE FUNCTION public.calculate_issue_times()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate reaction time (reported -> accepted)
  IF NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL THEN
    NEW.reaction_time_minutes := public.round_to_5_minutes(
      EXTRACT(EPOCH FROM (NEW.accepted_at - NEW.reported_at)) / 60
    );
  END IF;
  
  -- Calculate assignment time (accepted -> started)
  IF NEW.started_at IS NOT NULL AND OLD.started_at IS NULL THEN
    NEW.assignment_time_minutes := public.round_to_5_minutes(
      EXTRACT(EPOCH FROM (NEW.started_at - NEW.accepted_at)) / 60
    );
  END IF;
  
  -- Calculate work time (started -> completed)
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    NEW.work_time_minutes := public.round_to_5_minutes(
      EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60
    );
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_times_trigger
BEFORE UPDATE ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.calculate_issue_times();

-- Update timestamp trigger
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

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machines_updated_at
BEFORE UPDATE ON public.machines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: users can view all profiles, update own
CREATE POLICY "Users can view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles: only admins can manage, all authenticated can view
CREATE POLICY "Authenticated can view roles" ON public.user_roles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Machines: all authenticated can view, managers can manage
CREATE POLICY "Authenticated can view machines" ON public.machines
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can manage machines" ON public.machines
FOR ALL TO authenticated USING (public.is_manager(auth.uid()));

-- Issues: complex policies based on roles
CREATE POLICY "Authenticated can view issues" ON public.issues
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Reporters can create issues" ON public.issues
FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'kierownik_zmiany') OR
  public.has_role(auth.uid(), 'kontrola_jakosci') OR
  public.has_role(auth.uid(), 'kierownik_ur') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Managers can update all issues" ON public.issues
FOR UPDATE TO authenticated USING (public.is_manager(auth.uid()));

CREATE POLICY "Mechanics can update assigned issues" ON public.issues
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'mechanik') AND assigned_to = auth.uid()
);

-- Issue status history
CREATE POLICY "Authenticated can view status history" ON public.issue_status_history
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert status history" ON public.issue_status_history
FOR INSERT TO authenticated WITH CHECK (auth.uid() = changed_by);

-- Issue attachments
CREATE POLICY "Authenticated can view attachments" ON public.issue_attachments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can upload attachments" ON public.issue_attachments
FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);