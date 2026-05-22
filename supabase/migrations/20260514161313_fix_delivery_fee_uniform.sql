
/*
  # Padronizar taxa de entrega em R$ 8,00 para todos os bairros

  - Atualiza delivery_fee para 8.00 em todos os bairros ativos
*/

UPDATE neighborhoods SET delivery_fee = 8.00 WHERE active = true;
