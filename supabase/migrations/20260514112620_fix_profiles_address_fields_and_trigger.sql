/*
  # Fix profiles: address fields, trigger security, and RLS

  ## Root cause of "Database error saving new user"
  The handle_new_user trigger fires as the anon/service role at signup time,
  but the INSERT RLS policy on profiles requires `authenticated` role — so the
  trigger insert is blocked by RLS, causing Supabase Auth to bubble up the
  "Database error saving new user" message.

  ## Fixes
  1. Add all address fields to profiles table
  2. Recreate handle_new_user as SECURITY DEFINER so it bypasses RLS
  3. Keep INSERT policy for authenticated users (self-service profile upsert)
  4. Add phone field to profiles
*/

-- 1. Add address + phone fields to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'zip_code') THEN
    ALTER TABLE profiles ADD COLUMN zip_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'street') THEN
    ALTER TABLE profiles ADD COLUMN street text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'street_number') THEN
    ALTER TABLE profiles ADD COLUMN street_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'complement') THEN
    ALTER TABLE profiles ADD COLUMN complement text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'neighborhood') THEN
    ALTER TABLE profiles ADD COLUMN neighborhood text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'city') THEN
    ALTER TABLE profiles ADD COLUMN city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'state') THEN
    ALTER TABLE profiles ADD COLUMN state text;
  END IF;
END $$;

-- 2. Recreate handle_new_user as SECURITY DEFINER so it bypasses RLS
--    This is the standard Supabase pattern for auto-creating profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Drop and recreate the trigger to ensure it picks up the new function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Also allow upsert from the client side after signup (authenticated)
--    The existing INSERT policy covers this, but we also need upsert support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can upsert own profile'
  ) THEN
    CREATE POLICY "Users can upsert own profile"
      ON profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
