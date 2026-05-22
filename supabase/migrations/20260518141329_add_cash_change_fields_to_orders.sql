/*
  # Adicionar campos de troco na tabela orders

  ## Novas colunas
  - `needs_change` (boolean, default false) — cliente precisa de troco?
  - `change_for`   (numeric, default 0)    — valor que o cliente vai pagar (ex: R$ 100)
  - `change_amount`(numeric, default 0)    — troco calculado (change_for - total)

  ## Motivo
  Necessário para pedidos com pagamento em dinheiro, tanto no checkout online
  quanto no PDV, para que o entregador/operador saiba quanto troco levar.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'needs_change'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN needs_change boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'change_for'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN change_for numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'change_amount'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN change_amount numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

/*
  Também precisamos de uma policy que permita o admin inserir pedidos PDV
  com user_id = auth.uid() (mesmo sendo admin, não apenas customer).
  A policy existente "Authenticated users can create own orders" exige user_id = auth.uid()
  mas o placeOrder do PDV passava user_id: undefined, falhando silenciosamente.
  Adicionamos uma policy explícita para admins.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'Admins can create orders'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can create orders"
        ON public.orders FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
          )
        );
    $policy$;
  END IF;
END $$;
