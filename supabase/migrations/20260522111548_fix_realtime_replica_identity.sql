/*
  # Corrigir REPLICA IDENTITY para Realtime

  ## Problema
  As tabelas orders e order_items estão com REPLICA IDENTITY DEFAULT,
  o que faz o Supabase Realtime não enviar os dados completos do registro
  em eventos UPDATE e DELETE, impedindo que o painel admin receba
  atualizações em tempo real.

  ## Solução
  Alterar para REPLICA IDENTITY FULL para que todos os campos sejam
  enviados no payload do realtime, tanto para INSERT, UPDATE quanto DELETE.
*/

ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
