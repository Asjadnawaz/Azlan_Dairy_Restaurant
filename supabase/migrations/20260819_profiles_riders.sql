-- Migration: Complete Profiles, Riders, Orders Schema Sync and Backfill

-- 0. Ensure custom ENUM types in Postgres have all necessary values
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'rider';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'picked_up';
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivering';
    ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'completed';
  END IF;
END $$;

-- 1. Profiles Table & Missing Column Extensions
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely ensure columns exist if public.profiles pre-existed in database
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins full control profiles" ON public.profiles;
CREATE POLICY "Admins full control profiles" ON public.profiles
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 2. Safe Postgres Trigger: Automatically create public.profiles row on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role text;
  user_email text;
  user_name text;
  user_phone text;
BEGIN
  assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'customer');

  IF assigned_role NOT IN ('admin', 'rider', 'customer') THEN
    assigned_role := 'customer';
  END IF;

  user_email := COALESCE(new.email, new.id::text || '@user.local');
  user_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email, 'Customer');
  user_phone := COALESCE(new.raw_user_meta_data->>'phone', new.phone);

  BEGIN
    EXECUTE '
      INSERT INTO public.profiles (id, email, full_name, role, phone)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = NOW()
    ' USING new.id, user_email, user_name, assigned_role, user_phone;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: Do not fail auth signup if profile insertion encounters an unexpected error
    NULL;
  END;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Riders Table
CREATE TABLE IF NOT EXISTS public.riders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('available','busy','offline')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

-- Riders RLS Policies
DROP POLICY IF EXISTS "Authenticated users can select riders" ON public.riders;
CREATE POLICY "Authenticated users can select riders" ON public.riders
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Riders can update own profile" ON public.riders;
CREATE POLICY "Riders can update own profile" ON public.riders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert/update riders" ON public.riders;
CREATE POLICY "Admins can insert/update riders" ON public.riders
  FOR ALL TO authenticated USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 4. Extend Orders Table with rider fields and timestamps
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rider_note TEXT,
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;

-- 5. Enable Realtime Publications for orders & riders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'riders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.riders;
  END IF;
END $$;

-- 6. Immediate One-Time Backfill: Populates id, email, full_name, role, phone (handles user_role ENUM or TEXT)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    EXECUTE '
      INSERT INTO public.profiles (id, email, full_name, role, phone)
      SELECT 
        id,
        COALESCE(email, id::text || ''@user.local''),
        COALESCE(raw_user_meta_data->>''full_name'', raw_user_meta_data->>''name'', email, ''Customer''),
        (CASE 
          WHEN (raw_user_meta_data->>''role'') IN (''admin'',''rider'',''customer'') THEN raw_user_meta_data->>''role''
          ELSE ''customer''
        END)::user_role,
        COALESCE(raw_user_meta_data->>''phone'', phone)
      FROM auth.users
      ON CONFLICT (id) DO NOTHING;
    ';
  ELSE
    INSERT INTO public.profiles (id, role, phone)
    SELECT 
      id,
      CASE 
        WHEN (raw_user_meta_data->>'role') IN ('admin','rider','customer') THEN raw_user_meta_data->>'role'
        ELSE 'customer'
      END,
      COALESCE(raw_user_meta_data->>'phone', phone)
    FROM auth.users
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
