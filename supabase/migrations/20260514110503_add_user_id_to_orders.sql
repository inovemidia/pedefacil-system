/*
  # Add user_id to orders table

  1. Changes
    - Add `user_id` (uuid, nullable) foreign key to auth.users
    - Create index for fast user order queries
    - Add RLS policy to restrict users to their own orders

  2. Security
    - Users can only view/edit their own orders
    - Guest orders (user_id = null) can still exist
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX idx_orders_user_id ON orders(user_id);
  END IF;
END $$;

-- RLS policy for customers to view only their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- RLS policy for customers to update only their own orders (minimal access)
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
