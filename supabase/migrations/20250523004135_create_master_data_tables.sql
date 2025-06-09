-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table: currencies
CREATE TABLE public.currencies (
  code TEXT PRIMARY KEY CHECK (char_length(code) >= 3 AND char_length(code) <= 5),
  name TEXT NOT NULL,
  symbol TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_currencies
BEFORE UPDATE ON public.currencies
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view currencies" ON public.currencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert currencies" ON public.currencies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update currencies" ON public.currencies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete currencies" ON public.currencies FOR DELETE TO authenticated USING (true);

-- Table: exchange_rates
CREATE TABLE public.exchange_rates (
  id BIGSERIAL PRIMARY KEY,
  source_currency_code TEXT NOT NULL REFERENCES public.currencies(code) ON DELETE CASCADE,
  target_currency_code TEXT NOT NULL REFERENCES public.currencies(code) ON DELETE CASCADE,
  rate DECIMAL(10, 6) NOT NULL,
  last_updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  source_of_rate TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source_currency_code, target_currency_code)
);

CREATE TRIGGER set_updated_at_exchange_rates
BEFORE UPDATE ON public.exchange_rates
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view exchange_rates" ON public.exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert exchange_rates" ON public.exchange_rates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update exchange_rates" ON public.exchange_rates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete exchange_rates" ON public.exchange_rates FOR DELETE TO authenticated USING (true);

-- Table: agencies
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country_code TEXT,
  phone_number TEXT,
  email TEXT UNIQUE,
  operational_currency_code TEXT NOT NULL REFERENCES public.currencies(code),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_agencies
BEFORE UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view agencies" ON public.agencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert agencies" ON public.agencies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update agencies" ON public.agencies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete agencies" ON public.agencies FOR DELETE TO authenticated USING (true);

-- Table: vehicle_types
CREATE TABLE public.vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  capacity_passengers INTEGER DEFAULT 0,
  capacity_cargo_kg INTEGER DEFAULT 0,
  description TEXT,
  is_passenger_vehicle BOOLEAN DEFAULT true,
  is_cargo_vehicle BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_vehicle_types
BEFORE UPDATE ON public.vehicle_types
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view vehicle_types" ON public.vehicle_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vehicle_types" ON public.vehicle_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicle_types" ON public.vehicle_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete vehicle_types" ON public.vehicle_types FOR DELETE TO authenticated USING (true);

-- Table: vehicles (Fleet)
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT NOT NULL UNIQUE,
  make TEXT,
  model TEXT,
  year_of_manufacture INTEGER,
  vehicle_type_id UUID NOT NULL REFERENCES public.vehicle_types(id),
  assigned_agency_id UUID REFERENCES public.agencies(id),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Under Maintenance', 'Out of Service')),
  last_maintenance_date DATE,
  next_maintenance_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_vehicles
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (true);

-- Table: routes
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_city TEXT NOT NULL,
  end_city TEXT NOT NULL,
  average_duration_minutes INTEGER,
  distance_km INTEGER,
  stops_details JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_routes
BEFORE UPDATE ON public.routes
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view routes" ON public.routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert routes" ON public.routes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update routes" ON public.routes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete routes" ON public.routes FOR DELETE TO authenticated USING (true);

-- Table: schedules
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  days_of_operation JSONB NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  default_vehicle_type_id UUID NOT NULL REFERENCES public.vehicle_types(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_schedules
BEFORE UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view schedules" ON public.schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert schedules" ON public.schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update schedules" ON public.schedules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete schedules" ON public.schedules FOR DELETE TO authenticated USING (true);

-- Note: The RLS policies are very basic. They should be refined based on actual requirements,
-- for example, by checking user_id against a column in the table for ownership-based access,
-- or by checking custom roles.
-- The check (true) for INSERT/UPDATE/DELETE is a placeholder and means any authenticated user can perform the action.
-- This should be replaced with more specific conditions in a real application.
-- For example, for an 'agencies' table, an update policy might be:
-- CREATE POLICY "Agency managers can update their own agency"
-- ON public.agencies
-- FOR UPDATE TO authenticated
-- USING (auth.uid() = manager_user_id) -- Assuming a 'manager_user_id' column in 'agencies'
-- WITH CHECK (auth.uid() = manager_user_id);

-- The `gen_random_uuid()` function is used for default UUIDs.
-- The `updated_at` columns are automatically updated by the trigger.
-- Foreign key constraints include ON DELETE CASCADE where appropriate (e.g., schedules on routes).
-- Consider adding more specific checks for data integrity (e.g., check constraints for positive numbers, valid email formats, etc.).
