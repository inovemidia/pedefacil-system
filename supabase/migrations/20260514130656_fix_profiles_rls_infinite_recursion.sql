/*
  # Fix infinite recursion in profiles RLS

  The "Admins can view all profiles" policy queries the profiles table
  inside its own USING clause, causing infinite recursion on any SELECT/UPDATE.

  Fix: replace the self-referencing subquery with auth.jwt() to read the
  user's role directly from the JWT claims — no table lookup needed.
*/

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
