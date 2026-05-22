/*
  # Remover trigger automático de WhatsApp

  O envio de WhatsApp será feito de forma semi-automática pelo frontend:
  ao atualizar o status, o painel admin abre o wa.me automaticamente
  com a mensagem pronta e o número preenchido.
  O trigger via pg_net não é mais necessário.
*/

DROP TRIGGER IF EXISTS trigger_whatsapp_status ON orders;
DROP FUNCTION IF EXISTS notify_whatsapp_on_status_change();
