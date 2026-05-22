/*
  # Japa Nara — Complete Menu Seed

  Clears all existing products and categories, then seeds the official
  Japa Nara menu with 8 categories and all products using gen_random_uuid().
*/

-- 1. Clear existing data
DELETE FROM products;
DELETE FROM categories;

-- 2. Insert categories with generated UUIDs stored in variables via DO block
DO $$
DECLARE
  cat_combinados  uuid := gen_random_uuid();
  cat_pokes       uuid := gen_random_uuid();
  cat_temakis     uuid := gen_random_uuid();
  cat_pecas       uuid := gen_random_uuid();
  cat_copo        uuid := gen_random_uuid();
  cat_niguiri     uuid := gen_random_uuid();
  cat_joy         uuid := gen_random_uuid();
  cat_sashimi     uuid := gen_random_uuid();
BEGIN

INSERT INTO categories (id, name, slug, icon, display_order, active) VALUES
  (cat_combinados, 'Combinados',         'combinados',         '🍣', 1, true),
  (cat_pokes,      'Pokes',              'pokes',              '🍱', 2, true),
  (cat_temakis,    'Temakis Individual', 'temakis-individual', '🌯', 3, true),
  (cat_pecas,      'Peças por Unidade',  'pecas-por-unidade',  '🍙', 4, true),
  (cat_copo,       'Copo',               'copo',               '🥂', 5, true),
  (cat_niguiri,    'Niguiri',            'niguiri',            '🍣', 6, true),
  (cat_joy,        'Joy',                'joy',                '🍣', 7, true),
  (cat_sashimi,    'Sashimi',            'sashimi',            '🐟', 8, true);

-- ── Combinados ──────────────────────────────────────────────────────────────
INSERT INTO products (category_id, name, description, price, image_url, active, featured, display_order, serves) VALUES
(cat_combinados, 'Combinado 1',
 '3 Hossomaki salmão, 3 Hossomaki kani, 3 Uramaki Califórnia, 2 Mini temaki salmão',
 53.00, 'https://images.pexels.com/photos/8951228/pexels-photo-8951228.jpeg', true, true, 1, 2),

(cat_combinados, 'Combinado 2',
 '12 Uramaki Romeu e Julieta',
 53.00, 'https://images.pexels.com/photos/6249497/pexels-photo-6249497.jpeg', true, false, 2, 2),

(cat_combinados, 'Combinado 3',
 '12 Uramaki Filadélfia',
 53.00, 'https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg', true, false, 3, 2),

(cat_combinados, 'Combinado 4',
 '4 Hossomaki salmão, 4 Hossomaki kani, 4 Uramaki Califórnia, 4 Uramaki Filadélfia, 4 Uramaki Romeu e Julieta',
 79.00, 'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg', true, true, 4, 3),

(cat_combinados, 'Combinado 5',
 '4 Hossomaki salmão, 4 Hossomaki kani, 4 Uramaki Califórnia, 4 Uramaki Filadélfia, 4 Hot Holl',
 85.00, 'https://images.pexels.com/photos/884600/pexels-photo-884600.jpeg', true, true, 5, 3),

(cat_combinados, 'Combinado 6',
 '8 Hot Holl',
 42.00, 'https://images.pexels.com/photos/2323398/pexels-photo-2323398.jpeg', true, false, 6, 1),

(cat_combinados, 'Combinado 7',
 '4 Uramaki Filadélfia, 4 Hossomaki salmão, 5 Hossomaki castelinho, 5 Hossomaki kani, 5 Uramaki Califórnia, 4 Uramaki Romeu e Julieta, 3 Mini temaki salmão',
 135.00, 'https://images.pexels.com/photos/1148086/pexels-photo-1148086.jpeg', true, true, 7, 4),

(cat_combinados, 'Combinado 8',
 '4 Uramaki Filadélfia, 4 Uramaki skin, 4 Niguiri, 4 Hossomaki salmão, 4 Hossomaki kani, 4 Uramaki Romeu e Julieta, 4 Joy',
 130.00, 'https://images.pexels.com/photos/884600/pexels-photo-884600.jpeg', true, true, 8, 4),

-- ── Pokes ───────────────────────────────────────────────────────────────────
(cat_pokes, 'Poke Tradicional',
 'Base de arroz, salmão em cubos, morango, manga, pepino, doritos e cream cheese.',
 45.00, 'https://images.pexels.com/photos/5836391/pexels-photo-5836391.jpeg', true, true, 1, 1),

(cat_pokes, 'Poke Tropical',
 'Base de arroz, salmão em cubos, manga, chips de banana, pepino, cenoura ralada e cream cheese.',
 48.00, 'https://images.pexels.com/photos/5836387/pexels-photo-5836387.jpeg', true, false, 2, 1),

(cat_pokes, 'Poke Chef',
 'Base de arroz, abacate, manga, cebola roxa, salmão grelhado, chips de batata e cream cheese.',
 50.00, 'https://images.pexels.com/photos/5836392/pexels-photo-5836392.jpeg', true, false, 3, 1),

(cat_pokes, 'Poke Brasil',
 'Base de arroz, salmão em cubos, morango, manga, cebola roxa, tomate cereja, pepino e cream cheese.',
 60.00, 'https://images.pexels.com/photos/5836386/pexels-photo-5836386.jpeg', true, true, 4, 1),

(cat_pokes, 'Edamame',
 'Soja jovem colhida antes da maturação, verde e nutritiva.',
 10.00, 'https://images.pexels.com/photos/5409010/pexels-photo-5409010.jpeg', true, false, 5, 1),

-- ── Temakis Individual ───────────────────────────────────────────────────────
(cat_temakis, 'Mini Temaki Salmão',
 'Cone de alga nori com salmão fresco e arroz temperado.',
 15.00, 'https://images.pexels.com/photos/13946645/pexels-photo-13946645.jpeg', true, false, 1, 1),

(cat_temakis, 'Mini Temaki Hot Filadélfia',
 'Cone de alga com cream cheese, salmão empanado e molho sriracha.',
 18.00, 'https://images.pexels.com/photos/8951534/pexels-photo-8951534.jpeg', true, false, 2, 1),

(cat_temakis, 'Mini Temaki Hot Fechado',
 'Temaki fechado empanado e frito com recheio cremoso.',
 22.00, 'https://images.pexels.com/photos/8951228/pexels-photo-8951228.jpeg', true, false, 3, 1),

(cat_temakis, 'Temaki Salmão',
 'Cone generoso de alga nori com salmão fresco e arroz.',
 30.00, 'https://images.pexels.com/photos/13946645/pexels-photo-13946645.jpeg', true, true, 4, 1),

(cat_temakis, 'Temaki Filadélfia',
 'Cone de alga com cream cheese, salmão e pepino.',
 35.00, 'https://images.pexels.com/photos/8951534/pexels-photo-8951534.jpeg', true, false, 5, 1),

(cat_temakis, 'Temaki Hot Filadélfia',
 'Cone de alga com cream cheese, salmão empanado e sriracha.',
 40.00, 'https://images.pexels.com/photos/8951534/pexels-photo-8951534.jpeg', true, false, 6, 1),

(cat_temakis, 'Temaki Hot Fechado',
 'Temaki fechado frito com recheio de cream cheese e salmão.',
 42.00, 'https://images.pexels.com/photos/8951228/pexels-photo-8951228.jpeg', true, false, 7, 1),

(cat_temakis, 'Temaki Grelhado',
 'Cone de alga com salmão grelhado na manteiga de tarê.',
 40.00, 'https://images.pexels.com/photos/13946645/pexels-photo-13946645.jpeg', true, false, 8, 1),

(cat_temakis, 'Big Hot',
 'Versão grande do temaki hot com recheio duplo e molho especial.',
 45.00, 'https://images.pexels.com/photos/8951534/pexels-photo-8951534.jpeg', true, true, 9, 1),

(cat_temakis, 'Hot Boll (8 unidades)',
 '8 unidades de hot roll empanado e frito, crocante por fora e cremoso por dentro.',
 35.00, 'https://images.pexels.com/photos/8951228/pexels-photo-8951228.jpeg', true, false, 10, 2),

-- ── Peças por Unidade ────────────────────────────────────────────────────────
(cat_pecas, 'Hossomakis',
 'Peça de hossomaki — salmão ou kani enrolado em alga e arroz.',
 4.50, 'https://images.pexels.com/photos/6249497/pexels-photo-6249497.jpeg', true, false, 1, 1),

(cat_pecas, 'Uramakis',
 'Peça de uramaki — arroz por fora, recheio variado por dentro.',
 5.00, 'https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg', true, false, 2, 1),

(cat_pecas, 'Castelinho',
 'Peça de castelinho — hossomaki especial da casa.',
 5.50, 'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg', true, false, 3, 1),

(cat_pecas, 'Hot Holl',
 'Peça de hot roll empanado e frito, crocante e saboroso.',
 5.50, 'https://images.pexels.com/photos/884600/pexels-photo-884600.jpeg', true, false, 4, 1),

-- ── Copo ─────────────────────────────────────────────────────────────────────
(cat_copo, 'Copo',
 'Salmão em cubos, cream cheese, gergelim, tarê e cebolinha.',
 65.00, 'https://images.pexels.com/photos/1148086/pexels-photo-1148086.jpeg', true, true, 1, 1),

-- ── Niguiri ──────────────────────────────────────────────────────────────────
(cat_niguiri, 'Niguiri Salmão',
 'Bolinho de arroz com fatia de salmão fresco por cima.',
 6.00, 'https://images.pexels.com/photos/2323398/pexels-photo-2323398.jpeg', true, false, 1, 1),

(cat_niguiri, 'Niguiri Skin',
 'Bolinho de arroz com pele de salmão crocante grelhada.',
 6.00, 'https://images.pexels.com/photos/2323398/pexels-photo-2323398.jpeg', true, false, 2, 1),

-- ── Joy ──────────────────────────────────────────────────────────────────────
(cat_joy, 'Joy Salmão',
 'Bolinho de arroz empanado com salmão fresco por cima.',
 6.00, 'https://images.pexels.com/photos/8951228/pexels-photo-8951228.jpeg', true, false, 1, 1),

(cat_joy, 'Joy Doritos',
 'Bolinho de arroz com salmão e chips de doritos crocantes.',
 8.00, 'https://images.pexels.com/photos/8951228/pexels-photo-8951228.jpeg', true, false, 2, 1),

-- ── Sashimi ──────────────────────────────────────────────────────────────────
(cat_sashimi, 'Salmão (100g)',
 'Fatias de salmão fresco cortadas na espessura ideal, servidas com shoyu e wasabi.',
 25.00, 'https://images.pexels.com/photos/248444/pexels-photo-248444.jpeg', true, true, 1, 1);

END $$;
