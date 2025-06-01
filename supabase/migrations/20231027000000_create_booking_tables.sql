-- Helper function to automatically update 'updated_at' columns
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow guest bookings or staff bookings on behalf of others
    departure_id BIGINT NOT NULL, -- Assuming departures table exists or will be created
    schedule_id BIGINT NOT NULL, -- Assuming schedules table exists or will be created
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    booking_status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (booking_status IN ('confirmed', 'cancelled', 'pending_payment', 'completed')),
    booked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints separately if departures/schedules tables might not exist yet when this part is run
-- ALTER TABLE public.bookings ADD CONSTRAINT fk_departure FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE RESTRICT;
-- ALTER TABLE public.bookings ADD CONSTRAINT fk_schedule FOREIGN KEY (schedule_id) REFERENCES public.schedules(id) ON DELETE RESTRICT;
-- Note: For now, assuming departures and schedules tables will exist. If they are created in a later migration, these FKs need to be added there.

-- Trigger for updated_at on bookings
CREATE TRIGGER set_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- booking_passengers Table
CREATE TABLE IF NOT EXISTS public.booking_passengers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    age INT,
    gender TEXT,
    seat_number TEXT, -- Can be simple like "A1" or "12B"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at on booking_passengers
CREATE TRIGGER set_booking_passengers_updated_at
BEFORE UPDATE ON public.booking_passengers
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- booked_seats Table (Optional, for complex seat selection)
CREATE TABLE IF NOT EXISTS public.booked_seats (
    id BIGSERIAL PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    departure_id BIGINT NOT NULL, -- Denormalized for easier lookup, assuming departures table exists
    vehicle_id BIGINT NOT NULL, -- Assuming vehicles table exists
    seat_identifier TEXT NOT NULL, -- e.g., "A1", "B12", "SEAT-101"
    passenger_id UUID REFERENCES public.booking_passengers(id) ON DELETE SET NULL, -- Link to the specific passenger
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('reserved', 'confirmed', 'blocked')), -- 'available' not needed as only booked/reserved seats are stored
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints separately if related tables might not exist yet
-- ALTER TABLE public.booked_seats ADD CONSTRAINT fk_departure_seat FOREIGN KEY (departure_id) REFERENCES public.departures(id) ON DELETE CASCADE;
-- ALTER TABLE public.booked_seats ADD CONSTRAINT fk_vehicle_seat FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;
-- Note: For now, assuming departures and vehicles tables will exist.

-- Unique constraint to prevent double booking for the same seat on the same departure/vehicle
ALTER TABLE public.booked_seats
ADD CONSTRAINT unique_seat_on_departure_vehicle UNIQUE (departure_id, vehicle_id, seat_identifier);

-- Trigger for updated_at on booked_seats
CREATE TRIGGER set_booked_seats_updated_at
BEFORE UPDATE ON public.booked_seats
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();


-- Row Level Security (RLS)
-- Enable RLS for all tables
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booked_seats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
ON public.bookings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookings"
ON public.bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings (e.g. cancel)"
ON public.bookings FOR UPDATE
USING (auth.uid() = user_id);
-- No delete policy for users by default, usually handled by setting status to 'cancelled'

CREATE POLICY "Admin can manage all bookings"
ON public.bookings FOR ALL
USING (public.is_claims_admin()) -- Assumes is_claims_admin() function exists or similar role check
WITH CHECK (public.is_claims_admin());


-- RLS Policies for booking_passengers
CREATE POLICY "Users can view passengers of their own bookings"
ON public.booking_passengers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_passengers.booking_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert passengers for their own bookings"
ON public.booking_passengers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_passengers.booking_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update passengers for their own bookings"
ON public.booking_passengers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_passengers.booking_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Admin can manage all booking_passengers"
ON public.booking_passengers FOR ALL
USING (public.is_claims_admin())
WITH CHECK (public.is_claims_admin());


-- RLS Policies for booked_seats
CREATE POLICY "Users can view their own booked_seats"
ON public.booked_seats FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booked_seats.booking_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own booked_seats"
ON public.booked_seats FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booked_seats.booking_id AND b.user_id = auth.uid()
  )
);

-- Usually, users might not directly update or delete booked_seats; this might be system-managed.
-- Add update/delete policies if needed with appropriate checks.

CREATE POLICY "Admin can manage all booked_seats"
ON public.booked_seats FOR ALL
USING (public.is_claims_admin())
WITH CHECK (public.is_claims_admin());

-- Note: The RLS policies assume the existence of a function `public.is_claims_admin()`
-- which typically checks if the current user has an 'admin' role via Supabase custom claims.
-- If you use a different role or mechanism, adjust the policies accordingly.
-- Example for is_claims_admin (if not already present):
-- CREATE OR REPLACE FUNCTION public.is_claims_admin()
-- RETURNS boolean
-- LANGUAGE sql STABLE
-- AS $$
--   SELECT (auth.jwt()->>'app_metadata')::jsonb->>'user_role' = '"admin"';
-- $$;

-- Also, ensure that the `departures`, `schedules`, and `vehicles` tables exist
-- and have appropriate RLS policies if they are referenced by these booking tables.
-- The foreign key constraints for these are commented out but should be added
-- once those tables are confirmed to exist, potentially in their own migration files
-- or earlier in this file if they are simple.
-- For instance, if `departures` table has an `id` (BIGSERIAL) and `vehicles` has an `id` (BIGSERIAL).
--
-- Example placeholder for referenced tables (these should be properly defined elsewhere):
-- CREATE TABLE IF NOT EXISTS public.departures (id BIGSERIAL PRIMARY KEY, name TEXT);
-- CREATE TABLE IF NOT EXISTS public.schedules (id BIGSERIAL PRIMARY KEY, details TEXT);
-- CREATE TABLE IF NOT EXISTS public.vehicles (id BIGSERIAL PRIMARY KEY, type TEXT);
-- Remember to apply RLS to these tables as well.
