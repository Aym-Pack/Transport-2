-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update the updated_at column
-- Re-defining or ensuring it exists, as it's crucial for these tables.
-- If this was guaranteed by a previous migration and migrations run in order,
-- this re-definition might be redundant but ensures script is self-contained for these tables.
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table: user_profiles
CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  job_title TEXT, -- Example app-specific field
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_user_profiles
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);


-- Table: roles
CREATE TABLE public.roles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_roles
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
-- Placeholder policy: In a real app, this would be restricted to specific admin roles.
CREATE POLICY "Authenticated users can manage roles" ON public.roles FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- Table: permissions
CREATE TABLE public.permissions (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL UNIQUE, -- e.g., 'users:create', 'users:read', 'routes:manage'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_updated_at_permissions
BEFORE UPDATE ON public.permissions
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
-- Placeholder policy: In a real app, this would be restricted.
CREATE POLICY "Authenticated users can manage permissions" ON public.permissions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- Table: role_permissions (Join Table)
CREATE TABLE public.role_permissions (
  role_id BIGINT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
-- Placeholder policy
CREATE POLICY "Authenticated users can manage role_permissions" ON public.role_permissions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- Table: user_roles (Join Table)
CREATE TABLE public.user_roles (
  user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- Placeholder policy
CREATE POLICY "Authenticated users can manage user_roles" ON public.user_roles FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- Example Seed Data
INSERT INTO public.roles (name, description) VALUES
  ('SUPER_ADMIN', 'Super Administrator with all permissions'),
  ('AGENCY_MANAGER', 'Manages a specific agency operations and its staff'),
  ('BOOKING_AGENT', 'Handles bookings, customer interactions, and ticket sales for an agency'),
  ('OPERATIONS_STAFF', 'Staff involved in vehicle and trip operations (e.g., drivers, dispatchers)'),
  ('CUSTOMER_SUPPORT', 'Handles customer inquiries and support tickets'),
  ('FINANCE_MANAGER', 'Manages financial records, payments, and reporting'),
  ('REGISTERED_USER', 'Default role for authenticated users with basic portal access');

INSERT INTO public.permissions (action, description) VALUES
  -- System-wide permissions
  ('system:manage_all', 'Full control over the entire system (typically for SUPER_ADMIN)'),
  ('system:view_dashboard_stats', 'Access to system-wide statistics and analytics'),

  -- User and Role Management
  ('auth:manage_users', 'Create, update, delete users, assign roles (typically for SUPER_ADMIN)'),
  ('auth:manage_roles', 'Define and manage roles and their permissions (typically for SUPER_ADMIN)'),
  ('auth:view_user_profiles', 'View user profiles (could be restricted based on context)'),

  -- Agency Management
  ('agencies:create', 'Create new agencies'),
  ('agencies:read_all', 'View all agencies'),
  ('agencies:read_assigned', 'View only agencies the user is assigned to'),
  ('agencies:update_all', 'Update any agency details'),
  ('agencies:update_assigned', 'Update details of assigned agency'),
  ('agencies:delete', 'Delete agencies'),
  ('agencies:manage_staff', 'Manage staff within an assigned agency'),

  -- Fleet (Vehicles) Management
  ('vehicles:create', 'Add new vehicles to the fleet'),
  ('vehicles:read_all', 'View all vehicles'),
  ('vehicles:read_assigned_agency', 'View vehicles of the assigned agency'),
  ('vehicles:update_all', 'Update details of any vehicle'),
  ('vehicles:update_assigned_agency', 'Update vehicles of the assigned agency'),
  ('vehicles:delete', 'Remove vehicles from the fleet'),
  ('vehicles:manage_maintenance', 'Manage vehicle maintenance records'),

  -- Routes & Schedules Management
  ('routes:manage', 'Create, update, delete routes'),
  ('schedules:manage', 'Create, update, delete schedules for routes'),

  -- Bookings Management
  ('bookings:create_for_customer', 'Create bookings on behalf of customers'),
  ('bookings:read_all', 'View all bookings system-wide'),
  ('bookings:read_agency', 'View bookings associated with user''s agency'),
  ('bookings:update_status', 'Update booking status (e.g., confirm, cancel)'),
  ('bookings:cancel_any', 'Cancel any booking'),
  ('bookings:cancel_own_agency', 'Cancel bookings within user''s agency'),
  ('bookings:issue_tickets', 'Issue tickets for bookings'),

  -- Financial Management
  ('finance:manage_exchange_rates', 'Manage currency exchange rates'),
  ('finance:view_reports', 'View financial reports'),
  ('finance:manage_payments', 'Record and manage payments'),

  -- Customer Data (consider privacy and specific access needs)
  ('customers:view_list', 'View list of all customers'),
  ('customers:view_details', 'View detailed customer information including booking history'),
  ('customers:update_profile', 'Update customer profile information (e.g., as support agent)');

-- Assigning some permissions to roles (Example)
-- SUPER_ADMIN gets 'system:manage_all'
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT
    r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'SUPER_ADMIN' AND p.action = 'system:manage_all';

-- AGENCY_MANAGER gets 'agencies:update_assigned' and 'bookings:read_agency'
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT
    r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'AGENCY_MANAGER' AND p.action IN ('agencies:update_assigned', 'bookings:read_agency', 'agencies:manage_staff', 'vehicles:read_assigned_agency');

-- BOOKING_AGENT gets 'bookings:create_for_customer'
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT
    r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'BOOKING_AGENT' AND p.action IN ('bookings:create_for_customer', 'bookings:issue_tickets');

-- REGISTERED_USER might get basic read permissions or profile update
-- (Assuming a 'profile:update_own' permission for example)
-- INSERT INTO public.role_permissions (role_id, permission_id)
-- SELECT
-- r.id, p.id
-- FROM public.roles r, public.permissions p
-- WHERE r.name = 'REGISTERED_USER' AND p.action = 'profile:update_own';

-- Note: The RLS policies for roles, permissions, role_permissions, user_roles are very permissive placeholders.
-- In a real application, access to these tables would be tightly controlled, likely through security definer functions
-- or specific admin role checks in RLS policies, ensuring only authorized personnel can modify authorization structures.
-- For example, only a SUPER_ADMIN should be able to create new roles or assign arbitrary permissions.
-- The current RLS allows any authenticated user to manage these, which is not secure for production.
-- These will need to be revisited when implementing actual role-based access control logic in the application.
