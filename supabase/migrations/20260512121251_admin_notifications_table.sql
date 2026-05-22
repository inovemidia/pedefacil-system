/*
  # Create admin_notifications table

  1. New Tables
    - `admin_notifications`
      - `id` (uuid, primary key)
      - `type` (text) — notification type: payment_approved, payment_failed, payment_refunded, new_order
      - `title` (text) — short title for the notification
      - `message` (text) — detailed message
      - `order_id` (uuid, nullable) — related order
      - `read` (boolean, default false) — whether admin has seen it
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled
    - Only authenticated admin users can read/manage notifications
*/

CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'new_order',
  title text NOT NULL,
  message text NOT NULL,
  order_id uuid,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notifications"
  ON admin_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update notifications"
  ON admin_notifications FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role can insert notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

-- Index for fast unread queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
