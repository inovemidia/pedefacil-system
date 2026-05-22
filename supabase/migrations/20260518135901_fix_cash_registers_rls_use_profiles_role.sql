/*
  # Corrigir RLS de cash_registers e cash_movements

  ## Problema
  As policies antigas checavam auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'.
  O sistema armazena a role na tabela profiles, não no app_metadata do JWT.
  Por isso inserts/selects falhavam silenciosamente para o admin.

  ## Solução
  Substituir todas as policies para consultar profiles.role = 'admin',
  consistente com o restante do sistema.

  ## Tabelas afetadas
  - cash_registers (SELECT, INSERT, UPDATE)
  - cash_movements (SELECT, INSERT)
*/

-- ── cash_registers ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins manage cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Admins insert cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Admins update cash registers" ON public.cash_registers;

CREATE POLICY "Admins select cash registers"
  ON public.cash_registers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins insert cash registers"
  ON public.cash_registers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins update cash registers"
  ON public.cash_registers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins delete cash registers"
  ON public.cash_registers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ── cash_movements ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins select cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Admins insert cash movements" ON public.cash_movements;

CREATE POLICY "Admins select cash movements"
  ON public.cash_movements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins insert cash movements"
  ON public.cash_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins update cash movements"
  ON public.cash_movements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins delete cash movements"
  ON public.cash_movements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
