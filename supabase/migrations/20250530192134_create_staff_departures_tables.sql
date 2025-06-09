-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ENUM Types
CREATE TYPE public.staff_role_type AS ENUM ('DRIVER', 'HOSTESS', 'MECHANIC', 'OTHER_CREW');
CREATE TYPE public.departure_status_enum AS ENUM ('SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'CANCELLED', 'DELAYED', 'POSTPONED');

-- Table: staff_members
CREATE TABLE public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID UNIQUE REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  staff_type public.staff_role_type NOT NULL,
  employee_id_number TEXT UNIQUE,
  contact_phone TEXT,
  license_number TEXT, -- For drivers
  license_expiry_date DATE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_updated_at_staff_members
BEFORE UPDATE ON public.staff_members
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage staff_members" ON public.staff_members
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
-- TODO: Replace 'authenticated' with specific admin role/permission check.

-- Table: departures
CREATE TABLE public.departures (
  id BIGSERIAL PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE RESTRICT,
  departure_date DATE NOT NULL,
  planned_departure_time TIMETZ NOT NULL,
  planned_arrival_time TIMETZ NOT NULL,
  actual_departure_time TIMESTAMPTZ,
  actual_arrival_time TIMESTAMPTZ,
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  status public.departure_status_enum NOT NULL DEFAULT 'SCHEDULED',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (schedule_id, departure_date, planned_departure_time)
);

CREATE TRIGGER set_updated_at_departures
BEFORE UPDATE ON public.departures
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.departures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage departures" ON public.departures
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
-- TODO: Replace 'authenticated' with specific admin role/permission check.

-- Table: departure_crew (Join Table)
CREATE TABLE public.departure_crew (
  id BIGSERIAL PRIMARY KEY,
  departure_id BIGINT NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  assigned_role_in_departure TEXT NOT NULL DEFAULT 'CREW', -- E.g., 'DRIVER_MAIN', 'DRIVER_RELIEF', 'HOSTESS_LEAD'
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  -- No updated_at trigger for join tables typically, unless specific needs arise.
  UNIQUE (departure_id, staff_member_id, assigned_role_in_departure)
);

ALTER TABLE public.departure_crew ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage departure_crew" ON public.departure_crew
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
-- TODO: Replace 'authenticated' with specific admin role/permission check.

COMMENT ON COLUMN public.staff_members.user_profile_id IS 'Link to user_profiles if staff member is also a system user.';
COMMENT ON COLUMN public.staff_members.license_number IS 'For drivers or relevant roles.';
COMMENT ON COLUMN public.departures.schedule_id IS 'Prevent deleting a schedule if departures exist.';
COMMENT ON COLUMN public.departures.planned_departure_time IS 'Derived from schedule.departure_time, but stored for this instance.';
COMMENT ON COLUMN public.departures.planned_arrival_time IS 'Derived from schedule.arrival_time.';
COMMENT ON COLUMN public.departure_crew.assigned_role_in_departure IS 'More specific role for this departure, e.g., DRIVER_MAIN, HOSTESS_LEAD.';

-- Note: The RLS policies are placeholders and should be refined based on actual admin roles and permissions.
