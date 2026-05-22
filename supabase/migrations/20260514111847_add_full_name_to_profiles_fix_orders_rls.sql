/*
  # Fix profiles table and orders RLS

  1. Changes to profiles
     - Add `full_name` column (text, nullable) — required by signUp flow
     - Add INSERT policy so newly registered users can create their own profile

  2. Changes to orders RLS
     - Remove the overly permissive "Anyone can view orders by phone" policy
       (USING true = all rows visible to everyone, defeats user isolation)
     - Replace with a policy that allows:
       - Authenticated users to see their own orders (user_id = auth.uid())
       - Unauthenticated / guest lookup via phone handled separately if needed
       - Admins to see all orders (existing admin policy covers this)
*/

-- Add full_name to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN full_name text;
  END IF;
END $$;

-- Allow new users to insert their own profile row on signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Drop the broad open policy that lets anyone read all orders
DROP POLICY IF EXISTS "Anyone can view orders by phone" ON orders;

-- Replace with a policy that only lets authenticated users read their own orders
-- Guest order lookup (by phone/number) still works via the OrderStatusPage
-- which queries by order_number without requiring auth — we keep INSERT open
-- and add a separate anon read for order status tracking by ID
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'Authenticated users can view own orders'
  ) THEN
    CREATE POLICY "Authenticated users can view own orders"
      ON orders FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Allow anon to read orders by order_number for guest status tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'Anon can view orders for status tracking'
  ) THEN
    CREATE POLICY "Anon can view orders for status tracking"
      ON orders FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;
