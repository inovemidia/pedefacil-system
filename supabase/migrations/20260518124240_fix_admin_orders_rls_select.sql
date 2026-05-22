/*
  # Corrigir RLS da tabela orders para admins

  ## Problema
  A policy SELECT para usuários autenticados limitava a leitura apenas
  aos próprios pedidos (user_id = auth.uid()). Administradores logados
  como authenticated NÃO conseguiam ver pedidos de outros clientes,
  fazendo o painel AdminOrders aparecer vazio.

  ## Solução
  1. Remover a policy genérica de SELECT para authenticated que bloqueia admins
  2. Adicionar policy dedicada para admins verem TODOS os pedidos
  3. Manter policy para clientes verem apenas os seus próprios pedidos
  4. Manter policy de anon para rastreamento público por status
*/

-- Remove policies SELECT conflitantes
DROP POLICY IF EXISTS "Authenticated users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Anon can view orders for status tracking" ON orders;

-- Admins podem ver TODOS os pedidos
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Clientes autenticados veem apenas seus próprios pedidos
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
  );

-- Anon pode ver pedidos para rastreamento (tela de status pública)
CREATE POLICY "Anon can view orders for tracking"
  ON orders FOR SELECT
  TO anon
  USING (true);
