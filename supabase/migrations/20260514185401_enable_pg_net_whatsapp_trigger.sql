/*
  # Habilitar pg_net e criar trigger de notificação WhatsApp

  1. Habilita a extensão pg_net para requisições HTTP assíncronas
  2. Cria função notify_whatsapp_on_status_change que dispara HTTP POST
     para a edge function whatsapp-notify sempre que o status de um pedido muda
  3. Cria trigger na tabela orders que chama a função acima no UPDATE de status

  Notas:
  - O trigger só dispara quando o campo `status` muda de valor
  - A edge function recebe o telefone do cliente, o status novo e o tipo de pedido
  - Usa pg_net para chamada HTTP assíncrona (não bloqueia a transação)
*/

-- Habilitar pg_net
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Função que chama a edge function de WhatsApp via HTTP assíncrono
CREATE OR REPLACE FUNCTION notify_whatsapp_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_url text;
  v_payload jsonb;
  v_service_role_key text;
BEGIN
  -- Só age quando o status realmente muda
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Não enviar para status cancelled (sem mensagem definida) ou pedidos PDV sem telefone
  IF NEW.customer_phone IS NULL OR NEW.customer_phone = '' THEN
    RETURN NEW;
  END IF;

  v_url := current_setting('app.supabase_url', true) || '/functions/v1/whatsapp-notify';

  v_payload := jsonb_build_object(
    'phone',      NEW.customer_phone,
    'status',     NEW.status,
    'order_type', NEW.order_type,
    'order_number', NEW.order_number,
    'customer_name', NEW.customer_name
  );

  -- Chamada HTTP assíncrona via pg_net
  PERFORM extensions.http_post(
    url     := v_url,
    body    := v_payload::text,
    params  := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca deixar falha de WhatsApp quebrar a atualização de status
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_whatsapp_status ON orders;

-- Criar trigger
CREATE TRIGGER trigger_whatsapp_status
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_on_status_change();
