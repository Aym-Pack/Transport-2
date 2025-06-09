-- Ensure UUID extension is available (if not already from previous migrations)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update the updated_at column
-- Assuming this function might have been created in a previous migration.
-- If not, or to ensure it's available:
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table: passenger_tariffs
CREATE TABLE public.passenger_tariffs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  vehicle_type_id UUID REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
  passenger_category TEXT NOT NULL DEFAULT 'ADULT', -- Examples: 'ADULT', 'CHILD', 'INFANT', 'STUDENT'
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  currency_code TEXT NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
  valid_from DATE,
  valid_until DATE,
  days_of_week JSONB, -- Example: [1,2,3,4,5] for Mon-Fri (ISO 8601, Mon=1, Sun=7)
  is_active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT check_valid_dates CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

CREATE TRIGGER set_updated_at_passenger_tariffs
BEFORE UPDATE ON public.passenger_tariffs
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.passenger_tariffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage passenger tariffs" ON public.passenger_tariffs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
-- TODO: Replace 'authenticated' with specific admin role/permission check.

-- Table: promotions
CREATE TABLE public.promotions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  promo_code TEXT UNIQUE, -- Store trimmed and potentially uppercased by app logic
  discount_type TEXT NOT NULL, -- E.g., 'PERCENTAGE', 'FIXED_AMOUNT'
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),
  applicable_to_all_tariffs BOOLEAN DEFAULT false NOT NULL,
  applicable_routes JSONB, -- Array of route_ids
  applicable_vehicle_types JSONB, -- Array of vehicle_type_ids
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses >= 0),
  current_uses INTEGER DEFAULT 0 NOT NULL CHECK (current_uses >= 0),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT check_promotion_valid_dates CHECK (valid_until >= valid_from),
  CONSTRAINT check_promotion_current_uses CHECK (max_uses IS NULL OR current_uses <= max_uses)
);

CREATE TRIGGER set_updated_at_promotions
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage promotions" ON public.promotions
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
-- TODO: Replace 'authenticated' with specific admin role/permission check.


-- Table: promotion_applicable_tariffs (Join Table)
CREATE TABLE public.promotion_applicable_tariffs (
  promotion_id BIGINT NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  passenger_tariff_id BIGINT NOT NULL REFERENCES public.passenger_tariffs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (promotion_id, passenger_tariff_id)
);

ALTER TABLE public.promotion_applicable_tariffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage promotion_applicable_tariffs" ON public.promotion_applicable_tariffs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
-- TODO: Replace 'authenticated' with specific admin role/permission check.

-- Example Seed Data (Optional)
-- INSERT INTO public.passenger_tariffs (name, route_id, vehicle_type_id, passenger_category, price, currency_code, is_active)
-- VALUES
--   ('Downtown Express Adult Weekday', (SELECT id FROM public.routes WHERE name = 'City Center - Airport' LIMIT 1), (SELECT id FROM public.vehicle_types WHERE name = 'Standard Bus' LIMIT 1), 'ADULT', 150.00, 'XOF', true);

-- INSERT INTO public.promotions (name, discount_type, discount_value, valid_from, valid_until, applicable_to_all_tariffs, is_active)
-- VALUES
--   ('Weekend Bonanza', 'PERCENTAGE', 10.00, '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z', true, true);

-- Note: RLS policies are placeholders and should be refined based on actual admin roles and permissions.
-- The `auth.role() = 'authenticated'` check is a basic stand-in.
-- Consider using a specific admin role like `app_admin` or checking against a permissions table.THIS IS YOUR LAST TURN. Please submit your subtask report using the
`submit_subtask_report()`. In the summary section of the report, please include
a summary of the steps you have taken and the changes you have made so far. If
you were stuck while trying to complete the task, please explain what you were
trying to do and why you were stuck. The user may review this information to
provide feedback that may help you continue your work. Do not make any other
tool calls in this turn.
