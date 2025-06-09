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

-- ENUM Type: loyalty_reward_type_enum
CREATE TYPE public.loyalty_reward_type_enum AS ENUM (
  'PERCENTAGE_DISCOUNT_ON_BOOKING',
  'FIXED_AMOUNT_VOUCHER_ON_BOOKING',
  'FREE_TRIP_VOUCHER',
  'UPGRADE_TO_VEHICLE_TYPE',
  'COMPLIMENTARY_ITEM_OR_SERVICE'
);

-- Table: loyalty_programs
CREATE TABLE public.loyalty_programs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  points_per_currency_unit_spent DECIMAL(10, 4) NOT NULL CHECK (points_per_currency_unit_spent > 0),
  base_currency_code_for_points TEXT NOT NULL REFERENCES public.currencies(code) ON DELETE RESTRICT,
  is_active BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER set_updated_at_loyalty_programs
BEFORE UPDATE ON public.loyalty_programs
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage loyalty_programs" ON public.loyalty_programs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
-- TODO: Replace 'authenticated' with specific admin role/permission check.

-- Table: loyalty_tiers
CREATE TABLE public.loyalty_tiers (
  id BIGSERIAL PRIMARY KEY,
  loyalty_program_id BIGINT NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points_threshold INTEGER NOT NULL CHECK (points_threshold >= 0),
  description TEXT,
  tier_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (loyalty_program_id, name),
  UNIQUE (loyalty_program_id, points_threshold),
  UNIQUE (loyalty_program_id, tier_order)
);

CREATE TRIGGER set_updated_at_loyalty_tiers
BEFORE UPDATE ON public.loyalty_tiers
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage loyalty_tiers" ON public.loyalty_tiers
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
-- TODO: Replace 'authenticated' with specific admin role/permission check.

-- Table: loyalty_rewards
CREATE TABLE public.loyalty_rewards (
  id BIGSERIAL PRIMARY KEY,
  loyalty_tier_id BIGINT NOT NULL REFERENCES public.loyalty_tiers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  reward_type public.loyalty_reward_type_enum NOT NULL,
  reward_value_percentage INTEGER CHECK (reward_value_percentage IS NULL OR (reward_value_percentage > 0 AND reward_value_percentage <= 100)),
  reward_value_fixed_amount DECIMAL(10,2) CHECK (reward_value_fixed_amount IS NULL OR reward_value_fixed_amount > 0),
  reward_value_currency_code TEXT REFERENCES public.currencies(code) ON DELETE SET NULL,
  free_trip_route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  upgrade_to_vehicle_type_id UUID REFERENCES public.vehicle_types(id) ON DELETE SET NULL,
  complimentary_item_description TEXT,
  points_to_redeem INTEGER CHECK (points_to_redeem IS NULL OR points_to_redeem > 0),
  is_auto_applied_on_tier_achieve BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  CONSTRAINT chk_percentage_discount CHECK (reward_type != 'PERCENTAGE_DISCOUNT_ON_BOOKING' OR (reward_value_percentage IS NOT NULL AND reward_value_fixed_amount IS NULL AND reward_value_currency_code IS NULL AND free_trip_route_id IS NULL AND upgrade_to_vehicle_type_id IS NULL AND complimentary_item_description IS NULL)),
  CONSTRAINT chk_fixed_amount_voucher CHECK (reward_type != 'FIXED_AMOUNT_VOUCHER_ON_BOOKING' OR (reward_value_fixed_amount IS NOT NULL AND reward_value_currency_code IS NOT NULL AND reward_value_percentage IS NULL AND free_trip_route_id IS NULL AND upgrade_to_vehicle_type_id IS NULL AND complimentary_item_description IS NULL)),
  CONSTRAINT chk_free_trip CHECK (reward_type != 'FREE_TRIP_VOUCHER' OR (free_trip_route_id IS NOT NULL AND reward_value_percentage IS NULL AND reward_value_fixed_amount IS NULL AND reward_value_currency_code IS NULL AND upgrade_to_vehicle_type_id IS NULL AND complimentary_item_description IS NULL)),
  CONSTRAINT chk_upgrade_vehicle CHECK (reward_type != 'UPGRADE_TO_VEHICLE_TYPE' OR (upgrade_to_vehicle_type_id IS NOT NULL AND reward_value_percentage IS NULL AND reward_value_fixed_amount IS NULL AND reward_value_currency_code IS NULL AND free_trip_route_id IS NULL AND complimentary_item_description IS NULL)),
  CONSTRAINT chk_complimentary_item CHECK (reward_type != 'COMPLIMENTARY_ITEM_OR_SERVICE' OR (complimentary_item_description IS NOT NULL AND reward_value_percentage IS NULL AND reward_value_fixed_amount IS NULL AND reward_value_currency_code IS NULL AND free_trip_route_id IS NULL AND upgrade_to_vehicle_type_id IS NULL))
);

CREATE TRIGGER set_updated_at_loyalty_rewards
BEFORE UPDATE ON public.loyalty_rewards
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage loyalty_rewards" ON public.loyalty_rewards
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
-- TODO: Replace 'authenticated' with specific admin role/permission check.

COMMENT ON COLUMN public.loyalty_tiers.points_threshold IS 'Min points accumulated by user to reach this tier.';
COMMENT ON COLUMN public.loyalty_tiers.tier_order IS 'For ordering tiers (e.g., 0=Bronze, 1=Silver, 2=Gold).';
COMMENT ON COLUMN public.loyalty_rewards.reward_value_currency_code IS 'Required if reward_value_fixed_amount is set.';
COMMENT ON COLUMN public.loyalty_rewards.free_trip_route_id IS 'Required if reward_type is ''FREE_TRIP_VOUCHER''.';
COMMENT ON COLUMN public.loyalty_rewards.upgrade_to_vehicle_type_id IS 'Required if reward_type is ''UPGRADE_TO_VEHICLE_TYPE''.';
COMMENT ON COLUMN public.loyalty_rewards.complimentary_item_description IS 'Required if reward_type is ''COMPLIMENTARY_ITEM_OR_SERVICE''.';

-- Note: The RLS policies are placeholders and should be refined based on actual admin roles and permissions.
-- The `auth.role() = 'authenticated'` check is a basic stand-in.
-- Consider using a specific admin role like `app_admin` or checking against a permissions table.
