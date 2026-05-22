/*
  # Habilitar Realtime nas tabelas orders e order_items

  Adiciona as tabelas à publicação supabase_realtime para que
  o painel AdminOrders receba atualizações em tempo real via
  Supabase Realtime sem precisar recarregar a página.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
