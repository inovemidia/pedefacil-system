/*
  # Fix Security Issues

  1. Fix mutable search_path on update_updated_at function
     - Add SET search_path = '' to prevent search path injection

  2. Fix RLS policies that are always true (unrestricted INSERT)
     - admin_notifications: restrict service role insert to valid data
     - order_items: restrict to authenticated users inserting their own order's items,
       or anon inserting into orders they just created (handled via orders table)
     - orders: restrict INSERT so user_id matches auth.uid() (or null for guests)
     - payments: restrict to service role only (payments created by edge functions)

  3. Fix handle_new_user SECURITY DEFINER exposure
     - Revoke EXECUTE from anon and authenticated roles
     - Function is only called by the trigger, not via RPC
*/

-- ─── 1. Fix mutable search_path on update_updated_at ───────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── 2. Fix handle_new_user: revoke public RPC access ──────────────────────
-- The trigger calls this directly; anon/authenticated should never call it via RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Also fix its search_path while we're at it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ─── 3. Fix admin_notifications INSERT policy ──────────────────────────────
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.admin_notifications;

-- Only the service_role (used by edge functions/triggers) can insert notifications
-- anon and authenticated cannot insert directly
CREATE POLICY "Service role can insert notifications"
  ON public.admin_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ─── 4. Fix orders INSERT policy ───────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Authenticated users: user_id must match their uid
CREATE POLICY "Authenticated users can create own orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Guest (anon) users: user_id must be null
CREATE POLICY "Guests can create orders without user_id"
  ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- ─── 5. Fix order_items INSERT policy ──────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;

-- order_items must belong to an order that the current user owns
-- For authenticated: order must have matching user_id
CREATE POLICY "Authenticated users can insert items for own orders"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- For anon guests: order must have null user_id (just created in same session)
-- We allow this via service_role too so edge functions can insert
CREATE POLICY "Guests can insert items for guest orders"
  ON public.order_items
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id IS NULL
    )
  );

CREATE POLICY "Service role can insert order items"
  ON public.order_items
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ─── 6. Fix payments INSERT policy ─────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can insert payments" ON public.payments;

-- Payments are created only by edge functions running as service_role
CREATE POLICY "Service role can insert payments"
  ON public.payments
  FOR INSERT
  TO service_role
  WITH CHECK (true);
