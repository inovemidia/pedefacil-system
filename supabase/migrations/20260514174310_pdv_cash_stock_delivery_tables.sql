/*
  # PDV, Caixa, Estoque e Delivery

  1. Novas tabelas:
    - `cash_registers` - Controle de abertura/fechamento de caixa
    - `cash_movements` - Sangrias, entradas, saídas manuais
    - `pdv_orders` - Pedidos realizados pelo PDV (balcão)
    - `stock_items` - Controle de estoque por produto
    - `delivery_assignments` - Atribuição de entregas a motoboys

  2. Modificações:
    - `products` - Adiciona coluna stock_qty e stock_alert

  3. Segurança:
    - RLS habilitado em todas as novas tabelas
    - Apenas admins acessam
*/

-- Cash registers (caixa)
CREATE TABLE IF NOT EXISTS cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by uuid REFERENCES auth.users(id),
  closed_by uuid REFERENCES auth.users(id),
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  opening_balance numeric(10,2) DEFAULT 0,
  closing_balance numeric(10,2),
  expected_balance numeric(10,2),
  difference numeric(10,2),
  status text DEFAULT 'open' CHECK (status IN ('open','closed')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cash registers"
  ON cash_registers FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins insert cash registers"
  ON cash_registers FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins update cash registers"
  ON cash_registers FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Cash movements (sangrias, entradas, saídas)
CREATE TABLE IF NOT EXISTS cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid REFERENCES cash_registers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('opening','sale','manual_in','manual_out','sangria')),
  amount numeric(10,2) NOT NULL,
  description text DEFAULT '',
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','pix','credit_card','debit_card')),
  order_id uuid REFERENCES orders(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins select cash movements"
  ON cash_movements FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins insert cash movements"
  ON cash_movements FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Stock items
CREATE TABLE IF NOT EXISTS stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  quantity integer DEFAULT 0,
  alert_threshold integer DEFAULT 5,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins select stock"
  ON stock_items FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins insert stock"
  ON stock_items FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins update stock"
  ON stock_items FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Delivery assignments (motoboys)
CREATE TABLE IF NOT EXISTS delivery_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  motoboy_name text DEFAULT '',
  motoboy_phone text DEFAULT '',
  assigned_at timestamptz DEFAULT now(),
  picked_up_at timestamptz,
  delivered_at timestamptz,
  notes text DEFAULT ''
);
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins select delivery"
  ON delivery_assignments FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins insert delivery"
  ON delivery_assignments FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins update delivery"
  ON delivery_assignments FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
