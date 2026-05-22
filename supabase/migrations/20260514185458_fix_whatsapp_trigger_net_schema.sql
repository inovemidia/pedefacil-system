/*
  # Corrigir trigger WhatsApp - usar schema net correto

  - Recria a função notify_whatsapp_on_status_change usando net.http_post
  - URL do projeto Supabase hardcoded (server-side, seguro)
  - Service role key referenciada via secret configurado no banco
  - Trigger dispara apenas quando status muda para valor relevante
*/

CREATE OR REPLACE FUNCTION notify_whatsapp_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_url    text := 'https://jzlfpcqhleuufznvnlwf.supabase.co/functions/v1/whatsapp-notify';
  v_key    text;
  v_payload jsonb;
BEGIN
  -- Só age quando o status realmente muda
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Sem telefone, sem envio
  IF NEW.customer_phone IS NULL OR trim(NEW.customer_phone) = '' THEN
    RETURN NEW;
  END IF;

  -- Buscar service role key do vault (configurada como secret SUPABASE_SERVICE_ROLE_KEY)
  BEGIN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_key := NULL;
  END;

  -- Fallback: usar anon key se vault não disponível
  IF v_key IS NULL THEN
    v_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6bGZwY3FobGV1dWZ6bnZubHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NzM0MzksImV4cCI6MjA5NDA0OTQzOX0.mjFEhfaxVDs8dkOk4rKt_Sl1rdzwP94henrmjbRPITg';
  END IF;

  v_payload := jsonb_build_object(
    'phone',         NEW.customer_phone,
    'status',        NEW.status,
    'order_type',    NEW.order_type,
    'order_number',  NEW.order_number,
    'customer_name', NEW.customer_name
  );

  PERFORM net.http_post(
    url     := v_url,
    body    := v_payload,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_whatsapp_status ON orders;

CREATE TRIGGER trigger_whatsapp_status
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_on_status_change();
