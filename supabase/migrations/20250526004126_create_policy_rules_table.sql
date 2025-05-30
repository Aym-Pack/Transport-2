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

-- Define ENUM types
CREATE TYPE public.policy_rule_type AS ENUM ('CANCELLATION', 'MODIFICATION', 'REFUND');
CREATE TYPE public.fee_type_enum AS ENUM ('PERCENTAGE_OF_PRICE', 'FIXED_AMOUNT', 'NO_FEE');

-- Table: policy_rules
CREATE TABLE public.policy_rules (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  policy_type public.policy_rule_type NOT NULL,
  description TEXT,

  -- Applicability Conditions
  applicable_route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  applicable_vehicle_type_id UUID REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
  applicable_passenger_category TEXT, -- Matches values used in passenger_tariffs.passenger_category
  min_hours_before_departure INTEGER CHECK (min_hours_before_departure IS NULL OR min_hours_before_departure >= 0),
  max_hours_before_departure INTEGER CHECK (max_hours_before_departure IS NULL OR max_hours_before_departure >= 0),

  -- Rule Details
  fee_type public.fee_type_enum NOT NULL DEFAULT 'NO_FEE',
  fee_value DECIMAL(10, 2) CHECK (fee_value IS NULL OR fee_value >= 0),
  is_allowed BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,

  priority INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- CHECK Constraints
  CONSTRAINT max_hours_greater_than_min_hours CHECK (max_hours_before_departure IS NULL OR min_hours_before_departure IS NULL OR max_hours_before_departure > min_hours_before_departure),
  CONSTRAINT fee_value_required_for_fee_types CHECK ((fee_type = 'NO_FEE' AND fee_value IS NULL) OR (fee_type != 'NO_FEE' AND fee_value IS NOT NULL))
);

CREATE TRIGGER set_updated_at_policy_rules
BEFORE UPDATE ON public.policy_rules
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.policy_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage policy_rules" ON public.policy_rules
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
-- TODO: Replace 'authenticated' with specific admin role/permission check.

-- Comments on fields for clarity:
COMMENT ON COLUMN public.policy_rules.policy_type IS 'Type of policy rule, e.g., CANCELLATION, MODIFICATION, REFUND.';
COMMENT ON COLUMN public.policy_rules.applicable_passenger_category IS 'Matches values used in passenger_tariffs.passenger_category, e.g., ADULT, CHILD.';
COMMENT ON COLUMN public.policy_rules.min_hours_before_departure IS 'Minimum hours before scheduled departure for this rule to apply. Null means no minimum limit.';
COMMENT ON COLUMN public.policy_rules.max_hours_before_departure IS 'Maximum hours before scheduled departure for this rule to apply. Null means no maximum limit (up to departure time).';
COMMENT ON COLUMN public.policy_rules.fee_type IS 'Type of fee applied, e.g., PERCENTAGE_OF_PRICE, FIXED_AMOUNT, NO_FEE.';
COMMENT ON COLUMN public.policy_rules.fee_value IS 'Value for the fee. Null if fee_type is NO_FEE.';
COMMENT ON COLUMN public.policy_rules.is_allowed IS 'Is the action (defined by policy_type) allowed under these conditions?';
COMMENT ON COLUMN public.policy_rules.priority IS 'Higher number means higher priority. Rules with higher priority are evaluated first.';

-- Example Seed Data (Optional, commented out)
-- INSERT INTO public.policy_rules (name, policy_type, description, fee_type, fee_value, min_hours_before_departure, is_allowed, priority, is_active)
-- VALUES
--   ('Standard Cancellation - >24hr Notice', 'CANCELLATION', 'Full refund if cancelled more than 24 hours before departure.', 'NO_FEE', NULL, 24, true, 10, true),
--   ('Late Cancellation - <24hr Notice', 'CANCELLATION', '50% fee if cancelled less than 24 hours before departure.', 'PERCENTAGE_OF_PRICE', 50.00, 0, true, 20, true),
--   ('No Show Cancellation', 'CANCELLATION', 'No refund for no-shows (cancellation at or after departure).', 'PERCENTAGE_OF_PRICE', 100.00, NULL, true, 30, true),
--   ('Standard Modification - >12hr Notice', 'MODIFICATION', 'Modification allowed with a small fixed fee.', 'FIXED_AMOUNT', 5.00, 12, true, 10, true);

-- Note: The RLS policy is a placeholder and should be refined based on actual admin roles and permissions.
-- The `auth.role() = 'authenticated'` check is a basic stand-in.
-- Consider using a specific admin role like `app_admin` or checking against a permissions table.
